import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';
import FlashToastHandler from '@/components/flash-toast-handler';
import ReportIssueButton from '@/components/report-issue-button';

export default function AuthLayout({
    children,
    title,
    description,
    ...props
}: {
    children: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description} {...props}>
            <FlashToastHandler />
            {children}
            <ReportIssueButton />
        </AuthLayoutTemplate>
    );
}
