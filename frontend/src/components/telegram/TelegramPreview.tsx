import React from 'react';
import { InlineButton, MediaType, ParseMode } from '../../types';
import { Bot, CheckCheck, FileText, Image, Video } from 'lucide-react';

interface TelegramPreviewProps {
  title?: string;
  content: string;
  mediaType?: MediaType;
  mediaUrl?: string | null;
  parseMode?: ParseMode;
  buttons?: InlineButton[];
  botName?: string;
}

export const TelegramPreview: React.FC<TelegramPreviewProps> = ({
  title,
  content,
  mediaType = 'NONE',
  mediaUrl,
  buttons = [],
  botName = 'Telegram Pro Bot',
}) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-[#0f172a] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col font-sans">
      {/* Telegram Chat Header */}
      <div className="bg-[#1e293b] px-4 py-3 flex items-center gap-3 border-b border-slate-700/60">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white truncate">{botName}</h4>
          <p className="text-[11px] text-sky-400">bot</p>
        </div>
      </div>

      {/* Chat Background & Message Area */}
      <div className="p-4 bg-[#0b1329] bg-opacity-95 min-h-[300px] flex flex-col justify-end">
        {/* Message Bubble */}
        <div className="bg-[#1e293b] text-slate-100 rounded-2xl rounded-tl-sm p-3 max-w-[95%] shadow-lg border border-slate-700/50 self-start flex flex-col gap-2">
          {title && (
            <div className="text-xs font-bold text-sky-400 uppercase tracking-wider pb-1 border-b border-slate-700/50">
              {title}
            </div>
          )}

          {/* Media Attachment */}
          {mediaType === 'PHOTO' && (
            <div className="w-full rounded-xl overflow-hidden bg-slate-800 border border-slate-700 aspect-video flex items-center justify-center">
              {mediaUrl ? (
                <img
                  src={mediaUrl}
                  alt="Broadcast preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as any).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400 gap-1">
                  <Image className="w-8 h-8 text-sky-400" />
                  <span className="text-xs">Photo attachment</span>
                </div>
              )}
            </div>
          )}

          {mediaType === 'VIDEO' && (
            <div className="w-full rounded-xl overflow-hidden bg-slate-800 border border-slate-700 aspect-video flex items-center justify-center">
              <div className="flex flex-col items-center text-slate-400 gap-1">
                <Video className="w-8 h-8 text-indigo-400" />
                <span className="text-xs">{mediaUrl ? 'Video URL set' : 'Video attachment'}</span>
              </div>
            </div>
          )}

          {mediaType === 'DOCUMENT' && (
            <div className="flex items-center gap-3 p-2 bg-slate-800/80 rounded-xl border border-slate-700">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">Document Attachment</p>
                <p className="text-[10px] text-slate-400">PDF / Doc</p>
              </div>
            </div>
          )}

          {/* Message Text Content */}
          <div className="text-xs leading-relaxed text-slate-200 break-words whitespace-pre-wrap">
            {content || <span className="text-slate-500 italic">Type message text to preview...</span>}
          </div>

          {/* Time & Double Checkmarks */}
          <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 self-end -mt-1">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
          </div>
        </div>

        {/* Inline Keyboard Buttons */}
        {buttons && buttons.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 max-w-[95%]">
            {buttons.map((btn, index) => (
              <a
                key={index}
                href={btn.url || '#'}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 bg-slate-800/90 hover:bg-slate-700/90 text-sky-300 text-xs font-medium rounded-xl text-center border border-slate-700/70 shadow-sm transition-colors truncate block"
              >
                {btn.text || `Button ${index + 1}`}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
