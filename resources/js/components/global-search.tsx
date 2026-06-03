import { Button } from '@/components/ui/button';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import {
    Calendar,
    FileText,
    LoaderCircle,
    Search,
    ShieldQuestion,
    Ticket,
    User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type GlobalSearchResult = {
    id: string;
    type: 'application' | 'draft' | 'student' | 'window' | 'ticket';
    title: string;
    subtitle: string;
    url: string;
};

type GlobalSearchPayload = {
    results: GlobalSearchResult[];
};

const typeIcon = {
    application: FileText,
    draft: ShieldQuestion,
    student: User,
    window: Calendar,
    ticket: Ticket,
};

function resultLabel(type: GlobalSearchResult['type']) {
    if (type === 'draft') {
        return 'Manual verification';
    }

    return type.charAt(0).toUpperCase() + type.slice(1);
}

export function GlobalSearch() {
    const { auth } = usePage<SharedData>().props;
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GlobalSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const searchConfig = useMemo(() => {
        if (auth.admin) {
            return {
                endpoint: '/admin/global-search',
                placeholder: 'Search records...',
            };
        }

        if (auth.coordinator) {
            return {
                endpoint: '/coordinator/global-search',
                placeholder: 'Search applications...',
            };
        }

        if (auth.developer) {
            return {
                endpoint: '/developer/global-search',
                placeholder: 'Search console...',
            };
        }

        return null;
    }, [auth.admin, auth.coordinator, auth.developer]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                event.key.toLowerCase() === 'k'
            ) {
                event.preventDefault();
                setIsOpen((current) => !current);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        if (!searchConfig || query.trim().length < 2) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setIsLoading(true);

            try {
                const params = new URLSearchParams({ search: query.trim() });
                const response = await fetch(
                    `${searchConfig.endpoint}?${params.toString()}`,
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        signal: controller.signal,
                    },
                );

                if (!response.ok) {
                    throw new Error('Search request failed.');
                }

                const payload = (await response.json()) as GlobalSearchPayload;
                setResults(payload.results ?? []);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setResults([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }, 250);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [query, searchConfig]);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setIsLoading(false);
        }
    }, [isOpen]);

    if (!searchConfig) {
        return null;
    }

    const visitResult = (url: string) => {
        setIsOpen(false);
        router.visit(url);
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                className="h-9 w-40 justify-start gap-2 px-3 text-muted-foreground sm:w-64 lg:w-80"
                onClick={() => setIsOpen(true)}
                aria-label="Open global search"
            >
                <Search className="h-4 w-4" />
                <span className="truncate text-sm">
                    {searchConfig.placeholder}
                </span>
                <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                    Ctrl K
                </kbd>
            </Button>

            <CommandDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                title="Global Search"
                className="sm:max-w-2xl"
            >
                <CommandInput
                    value={query}
                    onValueChange={setQuery}
                    placeholder={searchConfig.placeholder}
                />
                <CommandList>
                    {query.trim().length < 2 ? (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Type at least 2 characters to search.
                        </div>
                    ) : (
                        <>
                            <CommandEmpty>
                                {isLoading
                                    ? 'Searching...'
                                    : 'No results found.'}
                            </CommandEmpty>
                            <CommandGroup heading="Results">
                                {isLoading && results.length === 0 ? (
                                    <CommandItem disabled>
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                        <span>Searching...</span>
                                    </CommandItem>
                                ) : null}
                                {results.map((result) => {
                                    const ResultIcon = typeIcon[result.type];

                                    return (
                                        <CommandItem
                                            key={result.id}
                                            value={`${result.type}-${result.title}-${result.subtitle}`}
                                            onSelect={() =>
                                                visitResult(result.url)
                                            }
                                        >
                                            <ResultIcon className="h-4 w-4" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium">
                                                    {result.title}
                                                </span>
                                                <span className="block truncate text-xs text-muted-foreground">
                                                    {resultLabel(result.type)} -{' '}
                                                    {result.subtitle}
                                                </span>
                                            </span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
