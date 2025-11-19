'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { Spinner } from '@/components/spinner';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  SidebarProvider,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar';
import {
  FolderOpen,
  ArrowLeft
  // Info,
  // Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { AssetCard } from '@/components/AssetCard';
import { AssetView } from '@/components/asset-view';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { QuestInfo } from '@/components/quest-info';
import { SubQuestMenu } from './components/subquest-menu';
import { Quest } from '../quest-explorer';
import {
  BIBLE_BOOKS,
  // BibleBook,
  BibleBookQuest,
  BOOKS_MAP,
  ICONS_PATH
} from './bibleComponents/template';
import { BookCard } from './bibleComponents/BookCard';
import { ChapterCard } from './bibleComponents/ChapterCard';

interface QuestsBibleProps {
  project: any;
  projectId: string;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  // quests: any[] | undefined;
  questsTree: Quest[];
  questsLoading: boolean;
  onSelectQuest: (questId: string | null, quest?: Quest | null) => void;
  selectedQuestId: string | null;
  selectedQuest?: Quest | null;
}

export function QuestsBible({
  projectId,
  userRole,
  // quests,
  questsTree,
  questsLoading,
  onSelectQuest,
  selectedQuestId,
  selectedQuest
}: QuestsBibleProps) {
  const queryClient = useQueryClient();
  const { user, environment } = useAuth();

  // Modal states
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  // Chapter creation confirmation modal
  const [showChapterConfirmModal, setShowChapterConfirmModal] = useState(false);
  const [pendingChapter, setPendingChapter] = useState<{
    bookName: string;
    chapterNumber: number;
    book: BibleBookQuest;
  } | null>(null);

  // Separate state for book selection (by bookId)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  // State for chapter selection
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  const [books, setBooks] = useState<BibleBookQuest[]>(
    BIBLE_BOOKS.map((book) => ({
      bookId: book.id,
      chapters: book.chapters,
      verses: book.verses,
      id: '',
      name: book.name,
      description: null,
      metadata: null,
      parent_id: null,
      created_at: '',
      icon: `${ICONS_PATH}${book.id}@2x.webp`
    }))
  );

  useEffect(() => {
    if (!questsTree || questsTree.length === 0) {
      return;
    }

    const auxBooks = [...books];
    questsTree.forEach((quest) => {
      const metadata =
        typeof quest.metadata === 'string'
          ? JSON.parse(quest.metadata)
          : quest.metadata;
      const idx = BOOKS_MAP.get(metadata?.bible.book);
      if (idx !== undefined && auxBooks[idx]) {
        auxBooks[idx] = {
          ...auxBooks[idx],
          ...quest,
          metadata
        };
      }
    });
    setBooks(auxBooks);
  }, [questsTree]);

  // Handlers for modal actions
  const handleAssetClick = (asset: any) => {
    setSelectedAsset(asset);
    setShowAssetModal(true);
  };

  // Handle book selection - separate from quest selection
  const handleBookSelection = (bookId: string, book: BibleBookQuest) => {
    // Always update book selection
    setSelectedBookId(selectedBookId === bookId ? null : bookId);

    // Clear chapter selection when changing books
    setSelectedChapter(null);

    // Only update quest selection if the book has a real quest.id
    if (book.id && book.id.trim() !== '') {
      onSelectQuest(
        selectedQuestId === book.id ? null : book.id,
        selectedQuestId === book.id ? null : book
      );
    } else {
      // If no quest exists, clear quest selection but keep book selection
      onSelectQuest(null, null);
    }
  };

  // Handle chapter selection
  const handleChapterSelection = (chapterNumber: number) => {
    setSelectedChapter(
      selectedChapter === chapterNumber ? null : chapterNumber
    );
  };

  // Handle chapter click - check if quest exists or show confirmation modal
  const handleChapterClick = (
    chapterNumber: number,
    book: BibleBookQuest,
    chaptersQuest: BibleBookQuest[]
  ) => {
    // Check if there's already a quest for this specific chapter
    const chapterQuest = chaptersQuest[chapterNumber - 1];

    if (chapterQuest && chapterQuest.id && chapterQuest.id.trim() !== '') {
      // Chapter quest exists, proceed with normal selection
      handleChapterSelection(chapterNumber);
    } else {
      // No chapter quest exists, show confirmation modal
      setPendingChapter({
        bookName: book.name,
        chapterNumber,
        book
      });
      setShowChapterConfirmModal(true);
    }
  };

  // Handle chapter creation confirmation
  const handleConfirmChapterCreation = async () => {
    if (!pendingChapter) return;

    const { bookName, chapterNumber, book } = pendingChapter;
    const supabase = createBrowserClient(environment);

    try {
      let bookQuestId = book.id;
      let createdBook = null;

      // Check if book quest exists, if not create it
      if (!bookQuestId || bookQuestId.trim() === '') {
        // Create book quest
        const { data: bookQuestData, error: bookError } = await supabase
          .from('quest')
          .insert({
            name: bookName,
            description: `${book.chapters} chapters`,
            project_id: projectId,
            parent_id: null,
            metadata: {
              bible: {
                book: book.bookId
              }
            },
            creator_id: user?.id
          })
          .select()
          .single();

        if (bookError) {
          console.error('Error creating book quest:', bookError);
          toast.error('Failed to create book quest');
          return;
        }

        createdBook = bookQuestData;
        bookQuestId = bookQuestData.id;
      }

      // Create chapter quest
      const { data: chapterQuestData, error: chapterError } = await supabase
        .from('quest')
        .insert({
          name: `${bookName} ${chapterNumber}`,
          description: `${book.verses[chapterNumber - 1]} verses`,
          project_id: projectId,
          parent_id: bookQuestId,
          metadata: {
            bible: {
              book: book.bookId,
              chapter: chapterNumber
            }
          },
          creator_id: user?.id
        })
        .select()
        .single();

      // }

      if (chapterError) {
        console.error('Error creating chapter quest:', chapterError);
        toast.error('Failed to create chapter quest');
        return;
      }

      // Success - invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['quests', projectId] });
      queryClient.invalidateQueries({
        queryKey: ['child-quests', bookQuestId]
      });

      // Select the chapter and book
      handleChapterSelection(chapterNumber);
      setSelectedBookId(book.bookId);

      setBooks((prevBooks) => {
        return prevBooks.map((book) => {
          if (book.bookId === selectedBookId) {
            return {
              ...(createdBook ? createdBook : {}),
              ...book,
              children: [...(book.children || []), chapterQuestData],
              // Preservar chapters que vem do template original
              chapters: book.chapters // ← Importante manter isso
            };
          }
          return book;
        });
      });

      // Show success message
      toast.success(`Created ${bookName} ${chapterNumber}`);

      // Close modal and clear pending state
      setShowChapterConfirmModal(false);
      setPendingChapter(null);
    } catch (error) {
      console.error('Error creating quest:', error);
      toast.error('Failed to create quest');
    }
  };

  // Handle chapter creation cancellation
  const handleCancelChapterCreation = () => {
    setShowChapterConfirmModal(false);
    setPendingChapter(null);
  };

  // Handle going back in the hierarchy
  const goBack = () => {
    if (selectedChapter !== null) {
      // If chapter is selected, go back to chapters list (deselect chapter)
      setSelectedChapter(null);
    } else if (selectedBookId !== null) {
      // If book is selected, go back to books list (deselect book and quest)
      setSelectedBookId(null);
      onSelectQuest(null, null);
    }
  };

  // Find the actual quest ID based on the selectedQuestId (which is now bookId)
  const getActualQuestId = () => {
    if (!selectedQuestId) return null;
    const selectedBook = books.find((book) => book.bookId === selectedQuestId);
    return selectedBook?.id || null;
  };

  const handleQuestSuccess = (/*data: { id: string }*/) => {
    const actualQuestId = getActualQuestId();

    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({ queryKey: ['quests', projectId] });
    queryClient.invalidateQueries({
      queryKey: ['child-quests', actualQuestId]
    });
  };

  const handleAssetSuccess = (currentQuestId?: string) => {
    const actualQuestId = getActualQuestId();

    // Invalidate queries to refresh the data
    queryClient.invalidateQueries({
      queryKey: ['child-quests', actualQuestId]
    });
    // Also invalidate asset counts to update the project header
    queryClient.invalidateQueries({
      queryKey: ['assets-translations-count', projectId, environment]
    });
    // And invalidate quest-assets query to refresh asset list in quest view
    queryClient.invalidateQueries({
      queryKey: ['quest-assets', actualQuestId, environment]
    });
    if (currentQuestId && currentQuestId !== actualQuestId)
      queryClient.invalidateQueries({
        queryKey: ['quest-assets', currentQuestId, environment]
      });
  };

  return (
    <SidebarProvider>
      <div className="w-full flex min-h-[600px] gap-4">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0">
          <QuestsSideBar
            userRole={userRole}
            onSelectBook={handleBookSelection}
            selectedBookId={selectedBookId}
            // quests={quests}
            questsTree={books}
            questsLoading={questsLoading}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <QuestContent
            projectId={projectId}
            selectedQuestId={selectedQuestId}
            selectedBookId={selectedBookId}
            selectedChapter={selectedChapter}
            selectedQuest={(selectedQuest as BibleBookQuest) || null}
            questsTree={books}
            userRole={userRole}
            onSelectQuest={onSelectQuest}
            onSelectBook={handleBookSelection}
            onSelectChapter={handleChapterSelection}
            onChapterClick={handleChapterClick}
            onGoBack={goBack}
            onAssetClick={handleAssetClick}
            onQuestSuccess={handleQuestSuccess}
            onAssetSuccess={handleAssetSuccess}
          />
        </div>
      </div>

      {/* Asset View Modal */}
      <Dialog open={showAssetModal} onOpenChange={setShowAssetModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {selectedAsset && <AssetView asset={selectedAsset} />}
        </DialogContent>
      </Dialog>

      {/* Chapter Creation Confirmation Modal */}
      <Dialog
        open={showChapterConfirmModal}
        onOpenChange={setShowChapterConfirmModal}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Chapter Quest</DialogTitle>
            <DialogDescription>
              Do you want to create{' '}
              <b>
                {pendingChapter?.bookName} {pendingChapter?.chapterNumber}
              </b>
              ?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCancelChapterCreation}>
              Cancel
            </Button>
            <Button onClick={handleConfirmChapterCreation}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function QuestsSideBar({
  userRole,
  onSelectBook,
  selectedBookId,
  questsTree,
  questsLoading
}: {
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  onSelectBook: (bookId: string, book: BibleBookQuest) => void;
  selectedBookId: string | null;
  questsTree: Quest[] | undefined;
  questsLoading: boolean;
}) {
  // Calculate permissions from userRole
  const canManage = userRole === 'owner' || userRole === 'admin';

  // Build hierarchical quest structure
  // const buildQuestTree = (
  //   quests: any[],
  //   parentId: string | null = null
  // ): any[] => {
  //   return quests
  //     .filter((quest) => quest.parent_id === parentId)
  //     .map((quest) => ({
  //       ...quest,
  //       children: buildQuestTree(quests, quest.id)
  //     }));
  // };

  const renderQuest = (quest: Quest, level: number = 0) => {
    const bibleQuest = quest as BibleBookQuest;
    // Check if this book is selected (regardless of quest status)
    const isSelected = selectedBookId === bibleQuest.bookId;

    const QuestItem = (isSelected: boolean, quest: Quest) => {
      return (
        <>
          <div
            className={cn(
              'rounded-sm p-2 flex items-center justify-center',
              isSelected && 'bg-primary/10 text-primary'
            )}
          >
            {quest.children && quest.children.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[8px] text-secondary absolute bottom-0.5 -mr-5 px-1 py-0 bg-accent-foreground/70"
              >
                {quest.children.length}
              </Badge>
            )}
            {quest.icon ? (
              <img
                src={quest.icon}
                alt={quest.name}
                className="h-5 w-5 rounded-sm object-cover"
                style={{ filter: 'hue-rotate(180deg)' }}
              />
            ) : (
              <FolderOpen className="h-5 w-5" />
            )}
          </div>
          <span className={cn(isSelected && 'font-bold', 'truncate')}>
            {quest.name || `Quest ${quest.id?.slice(0, 8) || 'Unknown'}`}
          </span>
        </>
      );
    };

    // Only render root level quests (level 0), no expansion for children
    if (level > 0) return null;

    const ButtonComponent = (
      <SidebarMenuButton
        onClick={() => onSelectBook(bibleQuest.bookId, bibleQuest)}
        className={cn(
          'relative max-w-full truncate',
          isSelected && 'font-bold'
        )}
        data-quest-id={bibleQuest.bookId}
        title={quest.name || `Quest ${quest.id?.slice(0, 8) || 'Unknown'}`}
      >
        {QuestItem(isSelected, quest)}
      </SidebarMenuButton>
    );

    return (
      <SidebarMenuItem key={bibleQuest.bookId}>
        {ButtonComponent}
      </SidebarMenuItem>
    );
  };

  return (
    <Card className="flex flex-col max-w-full overflow-ellipsis">
      <CardHeader className="h-8 ">
        <div className="flex items-center justify-between ">
          <CardTitle className="text-lg">Books</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="py-1 px-2 flex-1 flex flex-col border-t border-b max-w-full">
        <ScrollArea className="h-[530px]">
          {questsLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading quests...
            </div>
          ) : questsTree && questsTree?.length > 0 ? (
            <SidebarMenu className="px-2 ">
              {questsTree && questsTree.map((quest) => renderQuest(quest))}
            </SidebarMenu>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No quests found. {canManage && 'Click + to create one.'}
            </div>
          )}
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground text-center">
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href="/portal">← Back to Portal</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function QuestContent({
  projectId,
  selectedBookId,
  selectedChapter,
  questsTree,
  userRole,
  onSelectBook,
  onChapterClick,
  onGoBack,
  onAssetClick,
  onQuestSuccess,
  onAssetSuccess
}: {
  projectId: string;
  selectedQuestId: string | null;
  selectedBookId: string | null;
  selectedChapter: number | null;
  selectedQuest: BibleBookQuest | null;
  questsTree: Quest[] | undefined;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  onSelectQuest: (questId: string | null, quest?: Quest | null) => void;
  onSelectBook: (bookId: string, book: BibleBookQuest) => void;
  onSelectChapter: (chapterNumber: number) => void;
  onChapterClick: (
    chapterNumber: number,
    book: BibleBookQuest,
    chaptersQuest: BibleBookQuest[]
  ) => void;
  onGoBack: () => void;
  onAssetClick: (asset: any) => void;
  onQuestSuccess?: () => void;
  onAssetSuccess?: (currentQuestId?: string) => void;
}) {
  const [chaptersQuest, setChaptersQuest] = useState<BibleBookQuest[]>([]);
  const { user, environment } = useAuth();
  const supabase = createBrowserClient(environment);

  const canManage = userRole === 'owner' || userRole === 'admin';

  useEffect(() => {
    if (!selectedBookId) return;
    const bookIdx = BOOKS_MAP.get(selectedBookId);

    if (bookIdx === undefined) return;
    const currentBook = (questsTree?.[bookIdx] as BibleBookQuest) || null;
    const aux = new Array(currentBook.chapters || 0);

    if (currentBook?.chapters) {
      currentBook?.children?.forEach((chapterQuest) => {
        console.log('Processing chapter quest:', chapterQuest);
        const metadata =
          typeof chapterQuest.metadata === 'string'
            ? JSON.parse(chapterQuest.metadata)
            : chapterQuest.metadata;
        const chapterNumber = metadata?.bible.chapter;
        aux[chapterNumber - 1] = chapterQuest as BibleBookQuest;
      });
    }
    setChaptersQuest(aux);
  }, [selectedBookId, selectedChapter]);

  const selectedBook = selectedBookId
    ? (questsTree?.[BOOKS_MAP.get(selectedBookId) || 0] as BibleBookQuest)
    : null;

  const rootQuests = questsTree || [];

  // Find the actual quest ID based on the bookId for database queries
  const actualQuestId = selectedBook?.id || null;

  // Find the chapter quest ID when a chapter is selected
  const getChapterQuestId = () => {
    if (!selectedChapter) return null;
    const chapterQuest = chaptersQuest[selectedChapter - 1];
    return chapterQuest?.id || null;
  };

  // Get the appropriate quest ID for SubQuestMenu
  const getMenuQuestId = () => {
    if (selectedChapter) {
      return getChapterQuestId();
    }
    return actualQuestId;
  };

  const currentChapterQuestId = getChapterQuestId();

  // Fetch assets for the selected quest through quest_asset_link
  const { data: questAssets, isLoading: questAssetsLoading } = useQuery({
    queryKey: ['quest-assets', currentChapterQuestId, environment],
    queryFn: async () => {
      if (!currentChapterQuestId) return [];

      console.log('Fetching assets for quest ID:', currentChapterQuestId);

      const { data, error } = await supabase
        .from('quest_asset_link')
        .select(
          `
          asset:asset_id (
            id,
            name,
            active,
            created_at,
            last_updated,
            images,
            content:asset_content_link(id, text, audio),
            tags:asset_tag_link(tag(id, key, value)),
            translations:asset!source_asset_id(count)
          )
        `
        )
        .eq('quest_id', currentChapterQuestId)
        .is('asset.source_asset_id', null)
        .order('created_at', { ascending: true });

      console.log('ASSETS', data, error);
      console.log('ERROR', data, error);

      if (error) throw error;

      // Filter only assets that are active and extract the asset data
      const assets =
        data
          ?.map((item: any) => item.asset)
          .filter((asset: any) => asset && asset.active) || [];

      return assets;
    },
    enabled: !!actualQuestId && !!user
  });

  const handleAssetClick = async (assetId: string) => {
    const query = supabase
      .from('asset')
      .select(
        `
            id, 
            name, 
            images,
            content:asset_content_link(id, audio, text),
            tags:asset_tag_link(tag(id, key, value)),
            quests:quest_asset_link(quest(id, name, description, 
              project(id, name, description),
              tags:quest_tag_link(tag(id, key, value))
            ))
          `
      )
      .eq('id', assetId);

    const { data: assets, error } = await query;

    if (error) {
      console.error('Error fetching asset details:', error);
      return;
    }

    if (assets && assets.length > 0) {
      // Fetch translations based on source_asset_id
      const { data: translations, error: translationsError } = await supabase
        .from('asset')
        .select(
          `
          id,
          name,
          content:asset_content_link(
            id,
            text,
            audio,
            source_language_id
          ),
          votes:vote!asset_id(
            polarity,
            creator_id
          )
          `
        )
        .eq('source_asset_id', assets[0].id)
        .eq('vote.active', true);

      if (translationsError) {
        console.error('Error fetching translations:', translationsError);
      }

      // Add translations to main asset
      const assetWithTranslations = {
        ...assets[0],
        translations: translations || []
      };

      onAssetClick(assetWithTranslations);
    }
  };

  if (!selectedBookId) {
    return (
      <Card className="h-full flex flex-col max-h-[700px] overflow-hidden">
        <CardHeader className="max-h-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="max-w-5/6 text-xl flex flex-row">
                <div className="truncate text-muted-foreground">
                  Choose a Book
                </div>
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 border-t">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-8">
              {/* Root Quests Section */}
              {rootQuests && rootQuests.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rootQuests.map((quest) => (
                      <BookCard
                        key={quest.id || (quest as BibleBookQuest).bookId}
                        quest={{
                          ...(quest as BibleBookQuest),
                          active: true
                        }}
                        isSelected={false}
                        onClick={() =>
                          onSelectBook(
                            (quest as BibleBookQuest).bookId,
                            quest as BibleBookQuest
                          )
                        }
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Quests Found</h3>
                  <p>This project doesn&#39;t have any quests yet.</p>
                  {canManage && (
                    <p className="text-sm mt-2">
                      Use the + button in the sidebar to create your first
                      quest.
                    </p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col max-h-[700px] overflow-hidden">
        <CardHeader className="max-h-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="max-w-5/6 text-xl flex flex-row gap-2">
                <Button
                  variant={'outline'}
                  className="rounded-lg transition-all hover:bg-muted px-1 py-1"
                  onClick={onGoBack}
                >
                  <ArrowLeft className="w-8" />
                </Button>
                <div className="truncate">
                  <img
                    src={selectedBook?.icon}
                    alt={`${selectedBook?.name} icon`}
                    className="w-8 h-8 inline-block mr-2"
                  />
                  {selectedBook?.name || 'Book'}
                  {selectedChapter ? ` - Chapter ${selectedChapter}` : ''}
                </div>
                <div className="self-center">
                  <QuestInfo
                    quest={
                      selectedBook
                        ? {
                            name: !selectedChapter
                              ? selectedBook.name
                              : `${selectedBook.name} - Chapter ${selectedChapter}`,
                            description: selectedChapter
                              ? `${selectedBook.verses[selectedChapter - 1]} verses`
                              : selectedBook.description ||
                                `${selectedBook?.chapters} chapters`,
                            created_at: selectedBook.created_at,
                            assets: []
                          }
                        : null
                    }
                  />
                </div>
              </CardTitle>
            </div>
            {/* Action Buttons */}
            {selectedChapter && currentChapterQuestId && (
              <SubQuestMenu
                canManage={canManage}
                projectId={projectId}
                selectedQuestId={getMenuQuestId()}
                onQuestSuccess={onQuestSuccess}
                onAssetSuccess={() =>
                  onAssetSuccess?.(currentChapterQuestId || undefined)
                }
                disableQuests={true}
              />
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 border-t">
          <ScrollArea className="h-[600px]">
            <div className="p-4 space-y-8">
              {questAssetsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Spinner />
                </div>
              ) : (
                <>
                  {/* Sub-Quests Section */}
                  {!selectedChapter && selectedBook?.chapters && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        {selectedBook?.verses?.map((totalVerses, idx) => (
                          <ChapterCard
                            key={idx}
                            quest={{
                              ...selectedBook,
                              id: selectedBook.id || '',
                              active: true
                            }}
                            isSelected={selectedChapter === idx + 1}
                            onClick={() =>
                              onChapterClick(
                                idx + 1,
                                selectedBook,
                                chaptersQuest
                              )
                            }
                            chapterNumber={idx + 1}
                            verseCount={totalVerses}
                            assetsCount={
                              0 //questCounts?.[selectedBook.id]?.assetsCount || 0
                            }
                            hasContent={chaptersQuest[idx] !== undefined}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assets Section */}
                  {questAssets && questAssets.length > 0 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {questAssets.map((asset) => (
                          <AssetCard
                            asset={asset}
                            key={asset.id}
                            onClick={() => handleAssetClick(asset.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {selectedChapter &&
                    (!questAssets || questAssets.length === 0) && (
                      <div className="text-center text-muted-foreground py-12">
                        <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">
                          No Content Yet
                        </h3>
                        <p>This chapter doesn&#39;t have any asset yet.</p>
                        {canManage && (
                          <p className="text-sm mt-2">
                            Use the buttons above to create assets.
                          </p>
                        )}
                      </div>
                    )}
                </>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
}
