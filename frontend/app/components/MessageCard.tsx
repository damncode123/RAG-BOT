'use client';

import { 
  DocumentTextIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: string;
  metadata?: {
    filename?: string;
    file_size?: number;
    processing_id?: string;
    status?: string;
    error?: string;
  };
}

interface MessageCardProps {
  message: Message;
}

export default function MessageCard({ message }: MessageCardProps) {
  // Regular message rendering
  if (!message.type || message.type === 'regular') {
    return (
      <div className="leading-relaxed text-slate-900 dark:text-slate-100">
        {message.text}
      </div>
    );
  }

  // Upload card rendering
  if (message.type === 'upload_card') {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 max-w-md">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
            <DocumentTextIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">File Upload</h3>
              <div className="flex items-center space-x-1">
                <ArrowPathIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Processing...</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {message.metadata?.filename}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {message.metadata?.file_size ? `${(message.metadata.file_size / 1024).toFixed(1)} KB` : ''}
                </span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Analyzing document and creating embeddings...
              </div>
              <div className="w-full bg-blue-100 dark:bg-blue-900/40 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Upload success card rendering
  if (message.type === 'upload_success_card') {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 max-w-md">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-green-900 dark:text-green-100">Processing Complete</h3>
              <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">
                Ready
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {message.metadata?.filename}
                </span>
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                ✅ Successfully embedded into knowledge base
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                You can now ask questions about this document!
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Upload error card rendering
  if (message.type === 'upload_error_card') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 max-w-md">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-semibold text-red-900 dark:text-red-100">Processing Failed</h3>
              <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium">
                Error
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {message.metadata?.filename}
                </span>
                <XCircleIcon className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                ❌ Failed to process document
              </div>
              {message.metadata?.error && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 p-2 rounded">
                  {message.metadata.error}
                </div>
              )}
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Please try uploading the file again.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error message rendering
  if (message.type === 'error') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">
            {message.text}
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="leading-relaxed text-slate-900 dark:text-slate-100">
      {message.text}
    </div>
  );
}
