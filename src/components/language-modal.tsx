'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/spinner';
import allLanguagesData from '@/components/resources/languages.json';

interface Language {
  '639-3': string;
  nativeName: string;
  englishName: string;
}

interface LanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onLanguageSelect: (language: Language) => void;
}

const pageLimit = 50;

export function LanguageModal({
  isOpen,
  onClose,
  language,
  onLanguageSelect
}: LanguageModalProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(false);

  // Form inputs (also used for filtering)
  const [nativeName, setNativeName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [codeIso639_3, setCodeIso639_3] = useState('');

  // Load languages when modal opens
  useEffect(() => {
    if (isOpen && languages.length === 0) {
      setLoading(true);
      // Use imported data instead of fetch
      try {
        setLanguages(allLanguagesData as Language[]);
        setLoading(false);
      } catch (error) {
        console.error('Error loading languages:', error);
        setLoading(false);
      }
    }
  }, [isOpen, languages.length]);

  // Initialize form with language prop
  useEffect(() => {
    if (language) {
      // Try to parse if it's a JSON string or use as english name
      try {
        const parsed = JSON.parse(language);
        if (parsed.nativeName) {
          setNativeName(parsed.nativeName || '');
          setEnglishName(parsed.englishName || '');
          setCodeIso639_3(parsed['639-3'] || '');
        }
      } catch {
        // If not JSON, treat as english name
        setEnglishName(language);
        setNativeName('');
        setCodeIso639_3('');
      }
    }
  }, [language, isOpen]);

  // Filter languages based on input values (limited to {pageLimit} results)
  const { filteredLanguages, totalMatches } = useMemo(() => {
    const matches = languages.filter((lang) => {
      const matchesNative = lang.nativeName
        .toLowerCase()
        .includes(nativeName.toLowerCase());
      const matchesEnglish = lang.englishName
        .toLowerCase()
        .includes(englishName.toLowerCase());
      const matchesCode = lang['639-3']
        .toLowerCase()
        .includes(codeIso639_3.toLowerCase());

      return matchesNative && matchesEnglish && matchesCode;
    });

    return {
      filteredLanguages: matches.slice(0, pageLimit), // Limit to {pageLimit} results
      totalMatches: matches.length
    };
  }, [languages, nativeName, englishName, codeIso639_3]);

  // Handle row click
  const handleRowClick = (selectedLanguage: Language) => {
    setNativeName(selectedLanguage.nativeName);
    setEnglishName(selectedLanguage.englishName);
    setCodeIso639_3(selectedLanguage['639-3']);
  };

  // Handle add button
  const handleAdd = () => {
    const languageData: Language = {
      nativeName,
      englishName,
      '639-3': codeIso639_3
    };
    onLanguageSelect(languageData);
    onClose();
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setNativeName('');
      setEnglishName('');
      setCodeIso639_3('');
    }
  }, [isOpen]);

  const isFormValid =
    nativeName.trim() && englishName.trim() && codeIso639_3.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add a Language</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          {/* Form Inputs (also used for filtering) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nativeName">Native Name</Label>
              <Input
                id="nativeName"
                value={nativeName}
                onChange={(e) => setNativeName(e.target.value)}
                placeholder="Enter/filter native name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="englishName">English Name</Label>
              <Input
                id="englishName"
                value={englishName}
                onChange={(e) => setEnglishName(e.target.value)}
                placeholder="Enter/filter english name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codeIso639_3">ISO 639-3 Code</Label>
              <Input
                id="codeIso639_3"
                value={codeIso639_3}
                onChange={(e) => setCodeIso639_3(e.target.value)}
                placeholder="Enter/filter ISO code"
                maxLength={3}
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground mb-2">
            💡 Type in the fields above to filter the table below, or click on a
            table row to fill the fields.
            {totalMatches > pageLimit && (
              <div className="mt-1 text-amber-600">
                ⚠️ Too many results! Only showing first {pageLimit}. Please
                refine your search.
              </div>
            )}
          </div>

          {/* Languages Table */}
          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-[360px]">
                <Spinner />
                <span className="ml-2">Loading languages...</span>
              </div>
            ) : (
              <ScrollArea className="h-[360px] border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Native Name</TableHead>
                      <TableHead>English Name</TableHead>
                      <TableHead>ISO 639-3</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLanguages.length > 0 ? (
                      filteredLanguages.map((lang, index) => (
                        <TableRow
                          key={index}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(lang)}
                        >
                          <TableCell>{lang.nativeName}</TableCell>
                          <TableCell>{lang.englishName}</TableCell>
                          <TableCell>{lang['639-3']}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center py-8 text-muted-foreground"
                        >
                          {languages.length === 0 && !loading
                            ? 'No languages loaded'
                            : 'No languages match the current filters'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {filteredLanguages.length > 0 && (
                <span>
                  Showing {filteredLanguages.length} of {totalMatches} matching
                  languages{' '}
                  {totalMatches > pageLimit ? `(max ${pageLimit} shown)` : ''}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={!isFormValid || loading}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LanguageModal;
