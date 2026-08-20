import { useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Archive, FileImage, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

const usageOptions = ["hero", "consultation", "editorial", "document", "other"] as const;

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AssetLibrary() {
  const { user, loading, isAuthenticated } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<(typeof usageOptions)[number]>("other");
  const [uploading, setUploading] = useState(false);
  const assets = trpc.assets.list.useQuery(undefined, { enabled: Boolean(isAuthenticated && user?.role === "admin") });
  const upload = trpc.assets.upload.useMutation({ onSuccess: () => { toast.success("File uploaded to secure storage"); assets.refetch(); }, onError: (error) => toast.error(error.message) });
  const archive = trpc.assets.archive.useMutation({ onSuccess: () => { toast.success("Asset archived"); assets.refetch(); }, onError: (error) => toast.error(error.message) });

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataBase64 = await fileToBase64(file);
      await upload.mutateAsync({ filename: file.name, mimeType: file.type, dataBase64, usage, altText: file.name.replace(/\.[^/.]+$/, "") });
    } finally { setUploading(false); if (inputRef.current) inputRef.current.value = ""; }
  }

  if (loading) return <div className="min-h-screen bg-[#f4f1ea] p-8 text-[#2e6f6b]"><Loader2 className="animate-spin" /></div>;
  if (!isAuthenticated) return <div className="flex min-h-screen items-center justify-center bg-[#f4f1ea] p-6"><div className="max-w-md border border-[#cdc8bd] bg-[#faf8f2] p-8"><p className="eyebrow">Private media library</p><h1 className="serif mt-5 text-4xl">Sign in to manage practice assets.</h1><button onClick={startLogin} className="btn-primary mt-7">Sign in <ArrowLeft size={14} className="rotate-180" /></button></div></div>;
  if (user?.role !== "admin") return <div className="flex min-h-screen items-center justify-center bg-[#f4f1ea] p-6"><div className="max-w-md border border-[#cdc8bd] bg-[#faf8f2] p-8"><p className="eyebrow">Access restricted</p><h1 className="serif mt-5 text-4xl">Admin access is required.</h1><Link href="/" className="btn-ghost mt-7">Return to website <ArrowLeft size={14} /></Link></div></div>;

  return <div className="min-h-screen bg-[#f4f1ea] text-[#312e29]"><header className="border-b border-[#cdc8bd] bg-[#f4f1ea]/95"><div className="container flex items-center justify-between py-5"><Link href="/" className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#2e6f6b]"><ArrowLeft size={15} /> Public website</Link><span className="eyebrow">Admin · File storage</span></div></header><main className="container py-14 lg:py-20"><div className="max-w-3xl"><p className="section-label">Practice operations</p><h1 className="serif mt-6 text-[clamp(3rem,6vw,6rem)] leading-[.92] tracking-[-.04em]">Approved <em className="text-[#2e6f6b]">media</em> and documents.</h1><p className="mt-6 max-w-xl text-[15px] leading-7 text-[#62675f]">Upload approved profile imagery and presentation documents to secure object storage. File bytes live in storage; this library stores metadata and issues signed previews only to authenticated admins.</p></div><section className="mt-12 grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><div className="border border-[#cdc8bd] bg-[#e9e5dc] p-6"><p className="eyebrow">New upload</p><label className="mt-6 block text-[10px] font-bold uppercase tracking-[.12em] text-[#6d756f]">Asset usage</label><select value={usage} onChange={(event) => setUsage(event.target.value as typeof usage)} className="mt-2 w-full border border-[#bdb8ad] bg-[#f4f1ea] px-3 py-3 text-sm"><option value="hero">Hero image</option><option value="consultation">Consultation image</option><option value="editorial">Editorial image</option><option value="document">Document</option><option value="other">Other</option></select><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFiles} className="sr-only" /><button onClick={() => inputRef.current?.click()} disabled={uploading} className="btn-primary mt-5 w-full">{uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} {uploading ? "Uploading…" : "Choose file"}</button><p className="mt-4 text-[11px] leading-5 text-[#747b73]">JPEG, PNG, WebP, or PDF · Maximum 8 MB</p></div><div><div className="mb-5 flex items-end justify-between"><div><p className="eyebrow">Stored assets</p><h2 className="serif mt-2 text-3xl">Your library</h2></div><span className="text-[11px] text-[#747b73]">{assets.data?.length ?? 0} active</span></div>{assets.isLoading ? <Loader2 className="animate-spin text-[#2e6f6b]" /> : assets.data?.length ? <div className="divide-y divide-[#cdc8bd] border-t border-[#cdc8bd]">{assets.data.map((asset) => <div className="flex items-center gap-4 py-4" key={asset.id}>{asset.mimeType.startsWith("image/") ? <img src={asset.previewUrl} alt={asset.altText ?? asset.filename} className="h-16 w-20 object-cover" /> : <div className="flex h-16 w-20 items-center justify-center bg-[#e4ebe3] text-[#2e6f6b]">{asset.mimeType === "application/pdf" ? <FileText size={22} /> : <FileImage size={22} />}</div>}<div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{asset.filename}</p><p className="mt-1 text-[10px] uppercase tracking-[.11em] text-[#747b73]">{asset.usage} · {(asset.sizeBytes / 1024).toFixed(0)} KB</p></div><button aria-label={`Archive ${asset.filename}`} onClick={() => archive.mutate({ id: asset.id })} className="p-2 text-[#747b73] transition-colors hover:text-[#2e6f6b]"><Archive size={16} /></button></div>)}</div> : <div className="border border-dashed border-[#bdb8ad] p-8 text-sm text-[#747b73]">No uploaded assets yet. Choose an approved file to begin.</div>}</div></section></main></div>;
}
