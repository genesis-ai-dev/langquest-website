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

interface LanguageData {
  '639-3': string;
  nativeName: string;
  englishName: string;
}

interface NewLanguoid {
  iso639_3: string;
  name: string;
}

interface LanguoidModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  onLanguoidSelect: (languoid: NewLanguoid) => void;
}

const pageLimit = 50;

export function LanguoidModal({
  isOpen,
  onClose,
  initialName,
  onLanguoidSelect
}: LanguoidModalProps) {
  const [languages, setLanguages] = useState<LanguageData[]>([]);
  const [loading, setLoading] = useState(false);

  // Form inputs (also used for filtering)
  const [name, setName] = useState('');
  const [codeIso639_3, setCodeIso639_3] = useState('');

  // Load languages when modal opens
  useEffect(() => {
    if (isOpen && languages.length === 0) {
      setLoading(true);
      try {
        setLanguages(allLanguagesData as LanguageData[]);
        setLoading(false);
      } catch (error) {
        console.error('Error loading languages:', error);
        setLoading(false);
      }
    }
  }, [isOpen, languages.length]);

  // Initialize form with initialName prop
  useEffect(() => {
    if (initialName) {
      setName(initialName);
      setCodeIso639_3('');
    }
  }, [initialName, isOpen]);

  // Filter languages based on input values (limited to {pageLimit} results)
  const { filteredLanguages, totalMatches } = useMemo(() => {
    const matches = languages.filter((lang) => {
      const matchesName =
        lang.englishName.toLowerCase().includes(name.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(name.toLowerCase());
      const matchesCode = lang['639-3']
        .toLowerCase()
        .includes(codeIso639_3.toLowerCase());

      return matchesName && matchesCode;
    });

    return {
      filteredLanguages: matches.slice(0, pageLimit),
      totalMatches: matches.length
    };
  }, [languages, name, codeIso639_3]);

  // Handle row click - use English name as the languoid name
  const handleRowClick = (selectedLanguage: LanguageData) => {
    setName(selectedLanguage.englishName);
    setCodeIso639_3(selectedLanguage['639-3']);
  };

  // Handle add button
  const handleAdd = () => {
    const languoidData: NewLanguoid = {
      name,
      iso639_3: codeIso639_3
    };
    onLanguoidSelect(languoidData);
    onClose();
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setCodeIso639_3('');
    }
  }, [isOpen]);

  const isFormValid = name.trim() && codeIso639_3.trim();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add a Language</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 overflow-hidden">
          {/* Form Inputs (also used for filtering) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Language Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter/filter language name"
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
            Type in the fields above to filter the table below, or click on a
            table row to fill the fields.
            {totalMatches > pageLimit && (
              <div className="mt-1 text-amber-600">
                Too many results! Only showing first {pageLimit}. Please refine
                your search.
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
                      <TableHead>English Name</TableHead>
                      <TableHead>Native Name</TableHead>
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
                          <TableCell>{lang.englishName}</TableCell>
                          <TableCell>{lang.nativeName}</TableCell>
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

export default LanguoidModal;

