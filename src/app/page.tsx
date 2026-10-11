"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  Copy,
  Check,
  Trash2,
  Image as ImageIcon,
  X,
  Download,
  Eye,
  CloudUpload,
  HardDrive,
  FileImage,
  Search,
  LayoutGrid,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { LoginPage } from "@/components/login-page";

// Types
interface ImageData {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  url: string;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "success" | "error";
  result?: ImageData;
}

// Utilities
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/gif": "GIF",
    "image/webp": "WEBP",
    "image/svg+xml": "SVG",
    "image/bmp": "BMP",
    "image/tiff": "TIFF",
    "image/avif": "AVIF",
  };
  return map[mimeType] || "IMG";
}

// ---- Upload Area Component ----
function UploadZone({
  onFilesSelected,
  isUploading,
}: {
  onFilesSelected: (files: File[]) => void;
  isUploading: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [onFilesSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onFilesSelected(files);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFilesSelected]
  );

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-2xl p-8 sm:p-12 transition-all duration-300 cursor-pointer
        ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        }
        ${isUploading ? "pointer-events-none opacity-60" : ""}
      `}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className={`rounded-2xl p-4 transition-all duration-300 ${
            isDragging
              ? "bg-primary text-primary-foreground scale-110"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <CloudUpload className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
        <div>
          <p className="text-base sm:text-lg font-semibold">
            {isDragging ? "Lepaskan di sini!" : "Drag & drop foto ke sini"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            atau{" "}
            <span className="text-primary font-medium underline underline-offset-4">
              klik untuk pilih file
            </span>
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            JPG
          </Badge>
          <Badge variant="secondary" className="text-xs">
            PNG
          </Badge>
          <Badge variant="secondary" className="text-xs">
            GIF
          </Badge>
          <Badge variant="secondary" className="text-xs">
            WEBP
          </Badge>
          <Badge variant="secondary" className="text-xs">
            SVG
          </Badge>
          <Badge variant="secondary" className="text-xs">
            AVIF
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground/70">
          Maksimal 10MB per file
        </p>
      </div>
    </div>
  );
}

// ---- Upload Progress Item ----
function UploadProgressItem({ item }: { item: UploadingFile }) {
  const isDone = item.status === "success";
  const isError = item.status === "error";

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        isError
          ? "border-destructive/50 bg-destructive/5"
          : isDone
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-border bg-muted/30"
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
          isError
            ? "bg-destructive/10 text-destructive"
            : isDone
            ? "bg-emerald-500/10 text-emerald-500"
            : "bg-primary/10 text-primary"
        }`}
      >
        {isDone ? (
          <Check className="h-5 w-5" />
        ) : isError ? (
          <X className="h-5 w-5" />
        ) : (
          <Upload className="h-5 w-5 animate-pulse" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(item.file.size)}
        </p>
        {!isDone && !isError && (
          <Progress value={item.progress} className="mt-2 h-1.5" />
        )}
      </div>
    </div>
  );
}

// ---- Image Card ----
function ImageCard({
  image,
  onCopyLink,
  onDelete,
  onPreview,
}: {
  image: ImageData;
  onCopyLink: (image: ImageData) => void;
  onDelete: (image: ImageData) => void;
  onPreview: (image: ImageData) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopyLink(image);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(image);
  };

  return (
    <Card className="group overflow-hidden p-0 gap-0 hover:shadow-lg transition-all duration-300 border-border/60 hover:border-border">
      {/* Thumbnail */}
      <div
        className="relative aspect-square overflow-hidden cursor-pointer bg-muted/50"
        onClick={() => onPreview(image)}
      >
        {!imgError ? (
          <img
            src={image.url}
            alt={image.originalName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full shadow-lg"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? "Tersalin!" : "Salin link"}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreview(image);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full shadow-lg text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hapus</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Extension badge */}
        <Badge
          variant="secondary"
          className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0 h-5 bg-black/60 text-white border-0"
        >
          {getExtension(image.mimeType)}
        </Badge>
      </div>

      {/* Info */}
      <CardContent className="p-3 gap-2">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-xs font-medium truncate flex-1 cursor-pointer hover:text-primary transition-colors"
            onClick={() => onPreview(image)}
            title={image.originalName}
          >
            {image.originalName}
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? "Tersalin!" : "Salin link"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{formatFileSize(image.size)}</span>
          {image.width && image.height && (
            <>
              <span>·</span>
              <span>
                {image.width}×{image.height}
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Preview Dialog ----
function PreviewDialog({
  image,
  open,
  onOpenChange,
  onCopyLink,
}: {
  image: ImageData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCopyLink: (image: ImageData) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!image) return null;

  const handleCopy = () => {
    onCopyLink(image);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = image.url;
    a.download = image.originalName;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="flex-1 bg-black/5 flex items-center justify-center min-h-[300px] max-h-[70vh]">
            <img
              src={image.url}
              alt={image.originalName}
              className="max-w-full max-h-[70vh] object-contain"
            />
          </div>

          {/* Info panel */}
          <div className="w-full sm:w-72 p-5 flex flex-col gap-4 bg-background border-t sm:border-t-0 sm:border-l">
            <DialogHeader className="p-0 gap-1">
              <DialogTitle className="text-base truncate">
                {image.originalName}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {formatDate(image.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ukuran</span>
                <span className="font-medium">{formatFileSize(image.size)}</span>
              </div>
              {image.width && image.height && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensi</span>
                  <span className="font-medium">
                    {image.width} × {image.height} px
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipe</span>
                <span className="font-medium">{image.mimeType}</span>
              </div>
            </div>

            {/* Link URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Link Gambar
              </label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-muted rounded-md px-2.5 py-1.5 text-xs truncate font-mono">
                  {image.url}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* HTML tag */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                HTML Tag
              </label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-muted rounded-md px-2.5 py-1.5 text-xs truncate font-mono">
                  {`<img src="${image.url}" alt="${image.originalName}">`}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<img src="${image.url}" alt="${image.originalName}">`
                    );
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Markdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Markdown
              </label>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-muted rounded-md px-2.5 py-1.5 text-xs truncate font-mono">
                  {`![${image.originalName}](${image.url})`}
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `![${image.originalName}](${image.url})`
                    );
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="mt-auto flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4 mr-1.5" />
                {copied ? "Tersalin!" : "Salin Link"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Gallery Skeleton ----
function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border/60">
          <Skeleton className="aspect-square w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---- Empty State ----
function EmptyState({ onUploadClick }: { onUploadClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-full bg-muted p-5 mb-4">
        <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold mb-1">Belum ada foto</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Upload foto pertamamu dan langsung dapat link-nya buat dipake di website manapun.
      </p>
      <Button variant="outline" onClick={onUploadClick}>
        <Upload className="h-4 w-4 mr-2" />
        Upload Sekarang
      </Button>
    </div>
  );
}

// ---- Main Page ----
export default function HomePage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: isAuthLoading, login, logout } = useAuth();
  const [images, setImages] = useState<ImageData[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewImage, setPreviewImage] = useState<ImageData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImageData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const prevAuthRef = useRef(false);
  const manualLogoutRef = useRef(false);

  // Show a toast when the session auto-expires (distinct from manual logout).
  useEffect(() => {
    if (prevAuthRef.current && !isAuthenticated && !manualLogoutRef.current) {
      toast({
        title: "Sesi berakhir",
        description: "Kamu idle lebih dari 30 menit. Silakan login lagi.",
        variant: "destructive",
      });
    }
    manualLogoutRef.current = false;
    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, toast]);

  // Fetch images on mount
  const fetchImages = useCallback(async () => {
    try {
      const res = await fetch("/api/images");
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchImages();
  }, [fetchImages, isAuthenticated]);

  // Upload files
  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const baseIndex = uploadingFiles.length;
      const newUploads: UploadingFile[] = files.map((file) => ({
        file,
        progress: 0,
        status: "uploading" as const,
      }));
      setUploadingFiles((prev) => [...prev, ...newUploads]);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        // Declared outside try so the catch block can also reference it.
        const targetIndex = baseIndex + i;

        try {
          // Simulate progress
          let progress = 0;
          const progressInterval = setInterval(() => {
            progress = Math.min(progress + Math.random() * 30, 90);
            setUploadingFiles((prev) =>
              prev.map((u, idx) =>
                idx === targetIndex ? { ...u, progress } : u
              )
            );
          }, 100);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          clearInterval(progressInterval);

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Upload failed");
          }

          const data = await res.json();

          setUploadingFiles((prev) =>
            prev.map((u, idx) =>
              idx === targetIndex
                ? { ...u, progress: 100, status: "success", result: data }
                : u
            )
          );

          setImages((prev) => [data, ...prev]);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Upload gagal";

          setUploadingFiles((prev) =>
            prev.map((u, idx) =>
              idx === targetIndex
                ? { ...u, progress: 0, status: "error" }
                : u
            )
          );

          toast({
            title: "Upload gagal",
            description: `${file.name}: ${message}`,
            variant: "destructive",
          });
        }
      }
    },
    [uploadingFiles.length, toast]
  );

  // Copy link
  const handleCopyLink = useCallback(
    (image: ImageData) => {
      navigator.clipboard.writeText(image.url).then(() => {
        toast({
          title: "Link tersalin!",
          description: `Link untuk ${image.originalName} sudah di-copy ke clipboard.`,
        });
      });
    },
    [toast]
  );

  // Delete image
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/images/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== deleteTarget.id));
        toast({
          title: "Foto dihapus",
          description: `${deleteTarget.originalName} berhasil dihapus.`,
        });
      } else {
        throw new Error("Delete failed");
      }
    } catch {
      toast({
        title: "Gagal menghapus",
        description: "Terjadi kesalahan saat menghapus foto.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, toast]);

  // Filter images
  const filteredImages = searchQuery
    ? images.filter(
        (img) =>
          img.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          img.mimeType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : images;

  const isUploading = uploadingFiles.some((u) => u.status === "uploading");
  const completedUploads = uploadingFiles.filter(
    (u) => u.status === "success"
  );
  const recentUploads = completedUploads.slice(-3);

  // Auth gate — show login page when not authenticated
  const handleLogout = useCallback(() => {
    manualLogoutRef.current = true;
    logout();
    setImages([]);
    setUploadingFiles([]);
    setSearchQuery("");
    setPreviewImage(null);
    setDeleteTarget(null);
    toast({
      title: "Berhasil keluar",
      description: "Kamu sudah logout dari ImgHost.",
    });
  }, [logout, toast]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <HardDrive className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">ImgHost</h1>
                <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">
                  Image Hosting Pribadi
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {images.length > 0 && (
                <Badge variant="secondary" className="text-xs font-medium">
                  <FileImage className="h-3 w-3 mr-1" />
                  {images.length} foto
                </Badge>
              )}
              <Button
                size="sm"
                onClick={() =>
                  uploadSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
              >
                <Upload className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Upload</span>
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleLogout}
                      aria-label="Keluar"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden sm:inline ml-1.5">Keluar</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
          {/* Upload Section */}
          <section ref={uploadSectionRef} className="mb-8">
            <UploadZone
              onFilesSelected={handleFilesSelected}
              isUploading={isUploading}
            />
          </section>

          {/* Upload Progress */}
          {uploadingFiles.length > 0 && (
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Progress
                </h2>
                {completedUploads.length > 0 && (
                  <span className="text-xs text-emerald-600 font-medium">
                    {completedUploads.length} berhasil
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {uploadingFiles.map((item, i) => (
                  <UploadProgressItem key={`${item.file.name}-${i}`} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Recent Uploads Quick Copy */}
          {recentUploads.length > 0 && !searchQuery && (
            <section className="mb-8">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Check className="h-4 w-4 text-emerald-500" />
                Baru Upload — Salin Link
              </h2>
              <div className="flex flex-wrap gap-2">
                {recentUploads.map((u) =>
                  u.result ? (
                    <div
                      key={u.result.id}
                      className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-xs font-medium truncate max-w-[120px] sm:max-w-[200px]">
                        {u.result.originalName}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/20"
                        onClick={() => handleCopyLink(u.result!)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Salin
                      </Button>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}

          {/* Gallery Section */}
          <section>
            {/* Toolbar */}
            {images.length > 0 && (
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari foto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </div>
            )}

            {/* Gallery */}
            {loading ? (
              <GallerySkeleton />
            ) : filteredImages.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredImages.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    onCopyLink={handleCopyLink}
                    onDelete={setDeleteTarget}
                    onPreview={setPreviewImage}
                  />
                ))}
              </div>
            ) : images.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada foto yang cocok dengan &quot;{searchQuery}&quot;
                </p>
              </div>
            ) : (
              <EmptyState
                onUploadClick={() =>
                  uploadSectionRef.current?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
              />
            )}
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>ImgHost — Image hosting pribadi. Gambar aman, link selalu aktif.</p>
            <p className="flex items-center gap-1">
              <LayoutGrid className="h-3 w-3" />
              {images.length} gambar tersimpan
            </p>
          </div>
        </footer>

        {/* Preview Dialog */}
        <PreviewDialog
          image={previewImage}
          open={!!previewImage}
          onOpenChange={(open) => {
            if (!open) setPreviewImage(null);
          }}
          onCopyLink={handleCopyLink}
        />

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus foto ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Foto <strong>{deleteTarget?.originalName}</strong> akan dihapus
                secara permanen. Link gambar yang sudah disalin sebelumnya tidak
                akan bisa diakses lagi.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
