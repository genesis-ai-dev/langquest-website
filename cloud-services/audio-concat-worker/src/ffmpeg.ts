/**
 * Concatenate multiple audio files into a single file
 * 
 * NOTE: FFmpeg.wasm doesn't work in Cloudflare Workers due to Web Worker requirements.
 * This implementation uses simple binary concatenation:
 * - For WAV: Combines data chunks (skips headers after first file)
 * - For MP3: Simple binary concatenation (works for CBR MP3s with same settings)
 * 
 * For production, consider:
 * - Moving to a Node.js service with native FFmpeg
 * - Using Cloudflare's Stream API (for video/audio)
 * - Using a dedicated media processing service
 */
export async function concatenateAudio(
  audioUrls: string[],
  format: 'mp3' | 'wav' = 'mp3'
): Promise<{ buffer: ArrayBuffer; durationMs: number }> {
  console.log(`[Audio Concat] Concatenating ${audioUrls.length} ${format.toUpperCase()} files`);

  // Download all audio files
  const audioBuffers: ArrayBuffer[] = [];
  let totalSize = 0;

  for (let i = 0; i < audioUrls.length; i++) {
    const url = audioUrls[i];
    console.log(`[Audio Concat] Processing file ${i + 1}/${audioUrls.length}`);
    
    let arrayBuffer: ArrayBuffer;
    
    if (url.startsWith('data:')) {
      // Handle data URL (base64 encoded)
      const base64Data = url.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let j = 0; j < binaryString.length; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }
      arrayBuffer = bytes.buffer;
      console.log(`[Audio Concat] Decoded base64 data: ${arrayBuffer.byteLength} bytes`);
    } else {
      // Handle HTTP URL
      console.log(`[Audio Concat] Downloading from URL: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download audio file ${i + 1}: ${response.status} ${response.statusText}`);
      }
      arrayBuffer = await response.arrayBuffer();
      console.log(`[Audio Concat] Downloaded ${arrayBuffer.byteLength} bytes`);
    }
    
    audioBuffers.push(arrayBuffer);
    totalSize += arrayBuffer.byteLength;
  }

  // Concatenate buffers based on format
  let concatenated: Uint8Array;
  let actualTotalSize = totalSize;

  if (format === 'wav') {
    // For WAV files, we need to handle the RIFF header properly
    // WAV structure: RIFF header (12 bytes) + fmt chunk + data chunk
    // To concatenate: Keep first file's header, combine data chunks, update file size
    
    const firstBuffer = new Uint8Array(audioBuffers[0]);
    
    // Find the data chunk in the first file (starts after "RIFF" header and fmt chunk)
    // Look for "data" chunk marker (0x64617461 = "data")
    let dataStart = 12; // After RIFF header
    let dataSize = 0;
    
    // Skip fmt chunk to find data chunk
    while (dataStart < firstBuffer.length - 8) {
      const chunkId = String.fromCharCode(
        firstBuffer[dataStart],
        firstBuffer[dataStart + 1],
        firstBuffer[dataStart + 2],
        firstBuffer[dataStart + 3]
      );
      const chunkSize = firstBuffer[dataStart + 4] | 
                       (firstBuffer[dataStart + 5] << 8) |
                       (firstBuffer[dataStart + 6] << 16) |
                       (firstBuffer[dataStart + 7] << 24);
      
      if (chunkId === 'data') {
        dataSize = chunkSize;
        dataStart += 8; // Skip chunk header
        break;
      }
      dataStart += 8 + chunkSize;
    }
    
    // Calculate total data size (sum of all data chunks)
    let totalDataSize = firstBuffer.length - dataStart;
    for (let i = 1; i < audioBuffers.length; i++) {
      const buffer = new Uint8Array(audioBuffers[i]);
      // Find data chunk in subsequent files
      let fileDataStart = 12;
      while (fileDataStart < buffer.length - 8) {
        const chunkId = String.fromCharCode(
          buffer[fileDataStart],
          buffer[fileDataStart + 1],
          buffer[fileDataStart + 2],
          buffer[fileDataStart + 3]
        );
        const chunkSize = buffer[fileDataStart + 4] | 
                         (buffer[fileDataStart + 5] << 8) |
                         (buffer[fileDataStart + 6] << 16) |
                         (buffer[fileDataStart + 7] << 24);
        
        if (chunkId === 'data') {
          fileDataStart += 8;
          totalDataSize += buffer.length - fileDataStart;
          break;
        }
        fileDataStart += 8 + chunkSize;
      }
    }
    
    // Create new WAV file with updated header
    actualTotalSize = dataStart + totalDataSize + 4; // +4 for RIFF size field
    concatenated = new Uint8Array(actualTotalSize);
    
    // Copy first file's header
    concatenated.set(firstBuffer.slice(0, dataStart), 0);
    
    // Update RIFF file size (total size - 8 bytes for "RIFF" and size field)
    const fileSize = actualTotalSize - 8;
    concatenated[4] = fileSize & 0xff;
    concatenated[5] = (fileSize >> 8) & 0xff;
    concatenated[6] = (fileSize >> 16) & 0xff;
    concatenated[7] = (fileSize >> 24) & 0xff;
    
    // Update data chunk size
    concatenated[dataStart - 4] = totalDataSize & 0xff;
    concatenated[dataStart - 3] = (totalDataSize >> 8) & 0xff;
    concatenated[dataStart - 2] = (totalDataSize >> 16) & 0xff;
    concatenated[dataStart - 1] = (totalDataSize >> 24) & 0xff;
    
    // Copy first file's data
    concatenated.set(firstBuffer.slice(dataStart), dataStart);
    let offset = dataStart + (firstBuffer.length - dataStart);
    
    // Copy data chunks from subsequent files
    for (let i = 1; i < audioBuffers.length; i++) {
      const buffer = new Uint8Array(audioBuffers[i]);
      let fileDataStart = 12;
      
      // Find data chunk
      while (fileDataStart < buffer.length - 8) {
        const chunkId = String.fromCharCode(
          buffer[fileDataStart],
          buffer[fileDataStart + 1],
          buffer[fileDataStart + 2],
          buffer[fileDataStart + 3]
        );
        const chunkSize = buffer[fileDataStart + 4] | 
                         (buffer[fileDataStart + 5] << 8) |
                         (buffer[fileDataStart + 6] << 16) |
                         (buffer[fileDataStart + 7] << 24);
        
        if (chunkId === 'data') {
          fileDataStart += 8;
          concatenated.set(buffer.slice(fileDataStart), offset);
          offset += buffer.length - fileDataStart;
          break;
        }
        fileDataStart += 8 + chunkSize;
      }
    }
    
    // Estimate duration for WAV: assume 16kHz mono 16-bit PCM
    // 16kHz = 16000 samples/sec, 16-bit = 2 bytes/sample = 32000 bytes/sec
    const sampleRate = 16000;
    const bytesPerSample = 2; // 16-bit = 2 bytes
    const channels = 1; // mono
    const bytesPerSecond = sampleRate * bytesPerSample * channels;
    const durationMs = Math.floor((totalDataSize / bytesPerSecond) * 1000);
    
    console.log(`[Audio Concat] Concatenated WAV: ${totalDataSize} bytes of audio data, estimated duration: ${durationMs}ms`);
    
    return {
      buffer: concatenated.buffer,
      durationMs
    };
  } else {
    // MP3: Simple binary concatenation
    concatenated = new Uint8Array(totalSize);
    let offset = 0;

    for (let i = 0; i < audioBuffers.length; i++) {
      const buffer = new Uint8Array(audioBuffers[i]);
      // For the first file, copy everything including headers
      // For subsequent files, we might want to skip ID3 tags, but for simplicity
      // we'll just concatenate everything. This works for most CBR MP3s.
      concatenated.set(buffer, offset);
      offset += buffer.length;
    }

    console.log(`[Audio Concat] Concatenated ${totalSize} bytes total`);

    // Estimate duration based on file size
    // Rough estimate: ~128kbps = ~16KB per second
    const estimatedBitrate = 128000; // 128 kbps (common MP3 bitrate)
    const bytesPerSecond = estimatedBitrate / 8; // 16000 bytes per second
    const durationMs = Math.floor((totalSize / bytesPerSecond) * 1000);

    console.log(`[Audio Concat] Estimated duration: ${durationMs}ms (${Math.floor(durationMs / 1000)}s)`);

    return { 
      buffer: concatenated.buffer, 
      durationMs 
    };
  }
}

