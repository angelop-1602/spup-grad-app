import AppLogoIcon from '@/components/app-logo-icon';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import FlashToastHandler from '@/components/flash-toast-handler';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from '@inertiajs/react';
import { Home, Menu, Search, Sparkles } from 'lucide-react';
import { type ReactNode } from 'react';

interface ApplyLayoutProps {
    children: ReactNode;
}

export default function ApplyLayout({ children }: ApplyLayoutProps) {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <FlashToastHandler />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_38%),linear-gradient(180deg,_rgba(236,253,245,0.96)_0%,_rgba(248,250,252,1)_52%,_rgba(255,255,255,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_transparent_40%),linear-gradient(180deg,_#052e16_0%,_#022c22_45%,_#020617_100%)]" />
            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
                <header className="mb-8 border-b border-border/70 pb-5 sm:pb-6">
                    <div className="flex items-start justify-between gap-3">
                        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5 pr-2 sm:gap-3">
                            <AppLogoIcon className="h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12" />
                            <div className="min-w-0 max-w-[12.5rem] sm:max-w-none">
                                <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-700 uppercase dark:text-emerald-100/80 sm:text-xs md:text-sm">
                                    Graduation Portal
                                </p>
                                <h1 className="text-xs leading-tight font-semibold text-foreground sm:text-sm md:text-lg">
                                    St. Paul University Philippines
                                </h1>
                            </div>
                        </Link>
                        <div className="hidden items-center gap-3 text-sm text-muted-foreground md:flex">
                            <Link href="/" className="rounded-md px-2 py-1 transition hover:bg-background/70 hover:text-foreground">
                                Home
                            </Link>
                            <Link
                                href="/?track=1"
                                className="rounded-md px-2 py-1 transition hover:bg-background/70 hover:text-foreground"
                            >
                                Track application
                            </Link>
                            <div className="rounded-lg border border-border/70 bg-background/75 backdrop-blur">
                                <AppearanceToggleDropdown />
                            </div>
                        </div>
                        <div className="md:hidden">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-lg">
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="right"
                                    className="w-[min(88vw,320px)] gap-0 border-border/70 bg-background/95 p-0 backdrop-blur"
                                >
                                    <SheetHeader className="border-b border-border/70 pr-12 text-left">
                                        <div className="flex items-center gap-3">
                                            <AppLogoIcon className="h-10 w-10 shrink-0 object-contain" />
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-semibold tracking-[0.14em] text-emerald-700 uppercase dark:text-emerald-100/80">
                                                    Graduation Portal
                                                </p>
                                                <SheetTitle className="text-sm leading-tight">
                                                    St. Paul University Philippines
                                                </SheetTitle>
                                            </div>
                                        </div>
                                    </SheetHeader>
                                    <div className="flex flex-1 flex-col px-4 py-4">
                                        <p className="mb-3 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                                            Navigation
                                        </p>
                                        <div className="flex flex-col gap-2">
                                            <SheetClose asChild>
                                                <Link
                                                    href="/"
                                                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-3 text-sm font-medium transition hover:bg-muted/60"
                                                >
                                                    <Home className="h-4 w-4 text-muted-foreground" />
                                                    Home
                                                </Link>
                                            </SheetClose>
                                            <SheetClose asChild>
                                                <Link
                                                    href="/?track=1"
                                                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-3 text-sm font-medium transition hover:bg-muted/60"
                                                >
                                                    <Search className="h-4 w-4 text-muted-foreground" />
                                                    Track application
                                                </Link>
                                            </SheetClose>
                                        </div>
                                        <Separator className="my-5" />
                                        <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-muted/20 px-3 py-3">
                                            <div className="min-w-0">
                                                <p className="flex items-center gap-2 text-sm font-medium">
                                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                                    Appearance
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Choose light, dark, or system mode.
                                                </p>
                                            </div>
                                            <AppearanceToggleDropdown className="shrink-0" />
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                </header>

                <main className="flex-1">{children}</main>
            </div>
        </div>
    );
}
