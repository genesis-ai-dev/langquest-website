# Bulk Upload Feature

The LangQuest platform now supports bulk uploading of projects and assets via CSV files. This feature allows you to efficiently create multiple projects with their associated quests and assets, or add multiple assets to existing quests.

## Features

### 🚀 Two Upload Modes

1. **Project-Level Upload**: Create entire projects with quests and assets
2. **Quest-Level Upload**: Add multiple assets to an existing quest

### ✨ Key Capabilities

- **Progress Tracking**: Real-time progress bar with item-by-item updates
- **Error Handling**: Detailed error reporting with row-specific messages
- **Data Validation**: Pre-upload validation with clear error messages
- **Template Downloads**: Get started quickly with sample CSV templates
- **Preview Mode**: Review your data before uploading
- **Batch Processing**: Efficient one-by-one processing with rollback on errors

## How to Access

### Admin Panel

1. Navigate to the Admin panel
2. Click on the "Bulk Upload" tab
3. Choose between "Project Upload" or "Quest Asset Upload"

### Quest Asset Manager

1. Select a quest in the Admin panel
2. Go to the Assets tab
3. Click "Bulk Upload Assets" button

## CSV Formats

### Project Upload Format

Creates complete projects with quests and assets:

```csv
project_name,project_description,source_language,target_language,quest_name,quest_description,quest_tags,asset_name,asset_content,asset_tags,asset_image_urls,asset_audio_urls
My Project,Description of my project,English,Spanish,Chapter 1,First section content,category1;tag1,Item A,Content for item A,tag1;tag2,https://example.com/image1.jpg,https://example.com/audio1.mp3
My Project,Description of my project,English,Spanish,Chapter 1,First section content,category1;tag1,Item B,Content for item B,tag2;tag3,,https://example.com/audio2.mp3
```

**Required Fields:**

- `project_name`: Name of the project
- `source_language`: Source language (must match database)
- `target_language`: Target language (must match database)
- `quest_name`: Name of the quest
- `asset_name`: Name of the asset

**Optional Fields:**

- `project_description`: Description of the project
- `quest_description`: Description of the quest
- `quest_tags`: Semicolon-separated tags for the quest
- `asset_content`: Text content for the asset
- `asset_tags`: Semicolon-separated tags for the asset
- `asset_image_urls`: Image URLs (noted but not processed yet)
- `asset_audio_urls`: Audio URLs (noted but not processed yet)

### Quest Asset Upload Format

Adds assets to an existing quest:

```csv
asset_name,asset_content,asset_tags,asset_image_urls,asset_audio_urls
Asset Name 1,Text content for this asset,category;tag,https://example.com/img1.jpg,https://example.com/sound1.mp3
Asset Name 2,Another piece of content,tag;other,,https://example.com/sound2.mp3
```

**Required Fields:**

- `asset_name`: Name of the asset

**Optional Fields:**

- `asset_content`: Text content for the asset
- `asset_tags`: Semicolon-separated tags for the asset
- `asset_image_urls`: Image URLs (noted but not processed yet)
- `asset_audio_urls`: Audio URLs (noted but not processed yet)

## Usage Instructions

### Step 1: Download Template

1. Click "Download Template" to get a sample CSV file
2. The template includes sample data and proper formatting

### Step 2: Prepare Your Data

1. Open the template in Excel, Google Sheets, or any CSV editor
2. Replace sample data with your actual content
3. Ensure required fields are filled
4. Use semicolons (`;`) to separate multiple tags
5. Save as CSV format

### Step 3: Upload and Preview

1. Click "Select CSV File" and choose your prepared file
2. Review the preview showing the first 5 rows
3. Check for any validation errors

### Step 4: Upload

1. Click "Upload X Items" to start the process
2. Monitor the progress bar and current item being processed
3. Review any errors or warnings in the progress tabs

## Data Processing Logic

### Project Upload Process

1. **Language Resolution**: Looks up language IDs from English names
2. **Project Handling**:
   - **Existing Projects**: If a project with the same name already exists, it will append new quests and assets to that project
   - **New Projects**: Creates new projects if they don't exist
3. **Quest Creation**: Creates quests within projects (reuses existing if same name within project)
4. **Tag Management**: Creates tags if they don't exist, links to quests/assets
5. **Asset Creation**: Creates assets with proper language association
6. **Content Addition**: Adds text content to assets
7. **Linking**: Links assets to quests

### Important Notes on Project Behavior

- **Project Reuse**: If you upload a CSV with a project name that already exists in the database, the system will add the new quests and assets to the existing project rather than creating a duplicate
- **Quest Grouping**: Within a project, quests with the same name will be reused, allowing you to add multiple assets to the same quest across different CSV rows
- **Asset Creation**: Assets are always created as new items, even if they have the same name as existing assets

### Quest Upload Process

1. **Quest Validation**: Ensures the target quest exists
2. **Language Inheritance**: Uses the quest's project source language
3. **Asset Creation**: Creates assets with inherited language
4. **Content & Tags**: Processes content and tags same as project upload
5. **Linking**: Links new assets to the specified quest

## Error Handling

### Validation Errors

- Missing required columns
- Empty required fields
- Invalid data formats

### Processing Errors

- Language not found in database
- Database constraint violations
- Network/connection issues

### Error Recovery

- Processing continues for valid rows even if some fail
- Detailed error reporting shows which rows failed and why
- Successful items are not rolled back if later items fail

## Best Practices

### Data Preparation

1. **Validate Languages**: Ensure language names exactly match database entries
2. **Consistent Naming**: Use consistent project and quest names for grouping
3. **Tag Format**: Use semicolons for multiple tags, avoid commas within tag names
4. **Content Quality**: Ensure text content is properly formatted

### Upload Strategy

1. **Start Small**: Test with a few rows first
2. **Backup Data**: Keep original CSV files as backups
3. **Monitor Progress**: Watch for errors during upload
4. **Review Results**: Check created items in the admin panel

### Performance Tips

1. **Batch Size**: Upload in reasonable batches (100-500 items)
2. **Network**: Ensure stable internet connection
3. **Browser**: Use modern browsers for best performance

## Troubleshooting

### Common Issues

**"Language not found" errors:**

- Check language names match exactly (case-sensitive)
- Verify languages exist in the database
- Use English names as they appear in the system

**"Missing required field" errors:**

- Ensure all required columns have values
- Check for extra spaces or formatting issues
- Verify CSV structure matches template

**Upload stalls or fails:**

- Check internet connection
- Try smaller batch sizes
- Refresh page and try again

### Getting Help

If you encounter issues:

1. Check the error messages in the progress tabs
2. Verify your CSV format against the templates
3. Test with a smaller subset of data
4. Contact support with specific error messages

## Future Enhancements

Planned improvements include:

- Image and audio file upload processing
- Advanced validation rules
- Bulk edit capabilities
- Import from other formats (Excel, JSON)
- Scheduled/automated imports
- Progress persistence across sessions

## Technical Notes

### Dependencies

- **Papa Parse**: CSV parsing library
- **Supabase**: Database operations
- **React Query**: Data fetching and caching
- **Shadcn/UI**: User interface components

### Performance Considerations

- Sequential processing prevents database conflicts
- Progress tracking provides user feedback
- Error isolation prevents cascade failures
- Memory-efficient streaming for large files

### Security

- Client-side validation before upload
- Server-side validation and sanitization
- User authentication required
- Database constraints prevent invalid data
