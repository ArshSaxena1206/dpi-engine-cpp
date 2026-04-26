import { useState, useRef } from 'react';
import { UploadCloud, File as FileIcon, Loader2, CheckCircle2, Download } from 'lucide-react';
import { cn } from '../lib/utils';

interface UploadProps {
  onUploadSuccess: () => void;
}

export default function Upload({ onUploadSuccess }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ message: string; outputFile: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setResult(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('pcapFile', file);

    try {
      const res = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResult({ message: 'Processing Complete', outputFile: data.outputFile });
        onUploadSuccess();
      } else {
        console.error('Upload failed');
        alert('Upload or processing failed.');
      }
    } catch (error) {
      console.error('Error during upload', error);
      alert('Error during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card text-center py-12">
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 transition-colors flex flex-col items-center justify-center',
            isDragging ? 'border-primary bg-primary/5' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50',
            isUploading ? 'opacity-50 pointer-events-none' : ''
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pcap,.pcapng"
          />
          
          <UploadCloud className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">
            {isDragging ? 'Drop PCAP file here' : 'Click or drag PCAP file here'}
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Upload a network capture file (.pcap) for deep packet inspection and rule processing.
          </p>

          {file && (
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center space-x-3 w-full max-w-sm">
              <div className="bg-blue-50 p-2 rounded">
                <FileIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left truncate">
                <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="btn btn-primary w-full max-w-xs"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing DPI...
              </>
            ) : (
              'Process File'
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-800">{result.message}</h3>
            <p className="text-green-600 text-sm mt-1">
              Your filtered PCAP file is ready for download.
            </p>
          </div>
          <a
            href={`http://localhost:3001/api/download/\${result.outputFile}`}
            download
            className="btn bg-white border border-green-200 text-green-700 hover:bg-green-50 shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Filtered PCAP
          </a>
        </div>
      )}
    </div>
  );
}
