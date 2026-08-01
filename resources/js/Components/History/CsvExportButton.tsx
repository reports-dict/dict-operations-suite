import Button from '@/Components/ui/Button';
import { Download } from 'lucide-react';
import { useState } from 'react';

interface CsvExportButtonProps {
    url: string;
    filename: string;
}

export default function CsvExportButton({ url, filename }: CsvExportButtonProps) {
    const [downloading, setDownloading] = useState(false);

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('Export request failed');
            const blob = await res.blob();
            const href = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = href;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(href);
        } catch {
            alert('Export failed. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Button type="button" variant="secondary" onClick={handleDownload} disabled={downloading}>
            <Download className="size-3.5" />
            {downloading ? 'Exporting…' : 'Export CSV'}
        </Button>
    );
}
