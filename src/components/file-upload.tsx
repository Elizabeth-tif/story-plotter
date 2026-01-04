'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, File, Loader2 } from 'lucide-react';
import { Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (file: UploadedFile) => void;
  onRemove?: (fileId: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  existingFiles?: UploadedFile[];
  className?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export function FileUpload({
  onUpload,
  onRemove,
  accept = 'image/*,.pdf,.doc,.docx,.txt',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  existingFiles = [],
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (file.size > maxSize) {
      setError(`File "${file.name}" exceeds ${formatFileSize(maxSize)} limit`);
      return null;
    }

    setUploading((prev) => [...prev, file.name]);
    setError(null);

    try {
      // Get presigned URL from API
      const urlResponse = await fetch('/api/upload/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, key, uploadId } = await urlResponse.json();

      // Upload to R2 using pre-signed URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Confirm upload and get proxied URL
      const confirmResponse = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (!confirmResponse.ok) {
        throw new Error('Failed to confirm upload');
      }

      const { publicUrl } = await confirmResponse.json();

      return {
        id: key,
        name: file.name,
        url: publicUrl, // This is now the proxied API URL, not direct R2
        size: file.size,
        type: file.type,
      };
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Failed to upload "${file.name}"`);
      return null;
    } finally {
      setUploading((prev) => prev.filter((name) => name !== file.name));
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const filesToUpload = multiple ? fileArray : [fileArray[0]];

    for (const file of filesToUpload) {
      const uploaded = await uploadFile(file);
      if (uploaded) {
        onUpload(uploaded);
      }
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be uploaded again
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type === 'application/pdf') return FileText;
    return File;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-accent/50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="sr-only"
        />
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">
          Drop files here or click to upload
        </p>
        <p className="text-xs text-muted-foreground">
          Max file size: {formatFileSize(maxSize)}
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Uploading Files */}
      {uploading.length > 0 && (
        <div className="space-y-2">
          {uploading.map((name) => (
            <div
              key={name}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm truncate flex-1">{name}</span>
              <span className="text-xs text-muted-foreground">Uploading...</span>
            </div>
          ))}
        </div>
      )}

      {/* Existing Files */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          {existingFiles.map((file) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
              >
                {file.type.startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-background flex items-center justify-center">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {onRemove && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => onRemove(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
