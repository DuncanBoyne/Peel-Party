"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileImage } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFiles: (files: File[]) => void; // always the full current list
  multiple?: boolean;
  maxFiles?: number; // only used when multiple
  label?: string;
  accept?: Record<string, string[]>;
  className?: string;
}

export default function FileUpload({
  onFiles,
  multiple = false,
  maxFiles = 10,
  label = "Upload your artwork",
  accept = { "image/*": [".png", ".jpg", ".jpeg", ".svg", ".pdf", ".ai", ".eps"] },
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const limit = multiple ? maxFiles : 1;

  function change(next: File[]) {
    setFiles(next);
    onFiles(next);
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => change(multiple ? [...files, ...accepted].slice(0, limit) : accepted.slice(0, 1)),
    accept,
    multiple,
  });

  return (
    <div className={className}>
      {label && <label className="block text-sm font-semibold text-[#111111] mb-2">{label}</label>}
      {files.length > 0 && (
        <ul className="flex flex-col gap-2 mb-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.lastModified}-${i}`} className="flex items-center gap-3 p-4 bg-[#f9f7f4] border border-[#e5e1d8] rounded-xl">
              <FileImage size={20} className="text-[#ef8733] shrink-0" />
              <span className="text-sm text-[#111111] truncate flex-1">
                {files.length > 1 && <strong className="font-semibold">Design {i + 1}: </strong>}
                {f.name}
              </span>
              <button
                onClick={() => change(files.filter((_, j) => j !== i))}
                className="text-[#6b7280] hover:text-red-500 cursor-pointer transition-colors"
                type="button"
                aria-label={`Remove ${f.name}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length < limit && (
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors text-center",
            files.length ? "p-4" : "p-8",
            isDragActive
              ? "border-[#ef8733] bg-[#fff7ed]"
              : "border-[#e5e1d8] bg-[#f9f7f4] hover:border-[#ef8733] hover:bg-[#fff7ed]"
          )}
        >
          <input {...getInputProps()} />
          <Upload size={24} className={isDragActive ? "text-[#ef8733]" : "text-[#6b7280]"} />
          <div>
            <p className="text-sm font-semibold text-[#111111]">
              {isDragActive
                ? "Drop your file here"
                : files.length
                  ? "Add another design"
                  : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-[#6b7280] mt-1">
              PNG, JPG, SVG, PDF, AI, EPS accepted{multiple && ` · up to ${limit} designs`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
