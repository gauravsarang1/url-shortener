import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Link2, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = longUrl.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a URL to shorten.');
      return;
    }

    // Basic client check to ensure http/https prefix is present
    let urlToSubmit = trimmed;
    if (!/^https?:\/\//i.test(urlToSubmit)) {
      urlToSubmit = `https://${urlToSubmit}`;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setShortUrl(null);
    setCopied(false);

    try {
      const response = await fetch('/api/urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToSubmit }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to shorten URL');
      }

      setShortUrl(data.shortUrl);
    } catch (err) {
      setErrorMessage((err as Error).message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shortUrl) return;

    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = shortUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] font-sans flex flex-col justify-between text-[#1A1C21]">
      {/* Geometric Balance Header */}
      <header className="w-full px-6 sm:px-12 py-5 sm:py-6 flex justify-between items-center bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
            <div className="w-5 h-5 border-2 border-white rounded-sm rotate-45" />
          </div>
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            SHORTLY
          </span>
        </div>
        <nav className="flex items-center gap-4 sm:gap-8 text-xs font-semibold text-slate-500 uppercase tracking-widest">
          <span className="hidden md:inline-block">Express + PostgreSQL</span>
          <span className="hidden sm:inline-block">Prisma + Zod</span>
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-mono text-[11px] font-bold">
            v1.0 MVP
          </span>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full flex flex-col items-center justify-center px-4 sm:px-12 py-10 sm:py-16">
        <div className="max-w-2xl w-full space-y-8">
          {/* Header Typography */}
          <div className="text-center space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter text-slate-900">
              Shorten your links{' '}
              <span className="text-indigo-600">instantly.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-500">
              A simple, powerful URL shortener built for speed and reliability.
            </p>
          </div>

          {/* Input Form with Geometric Balance Card Styling */}
          <div className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-xl shadow-indigo-100/70 border border-slate-200">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-grow relative">
                <label htmlFor="url-input" className="sr-only">
                  Enter your long URL
                </label>
                <input
                  id="url-input"
                  type="text"
                  value={longUrl}
                  onChange={(e) => {
                    setLongUrl(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your long URL here..."
                  disabled={isLoading}
                  className="w-full px-5 py-4 sm:px-6 sm:py-5 rounded-xl bg-slate-50 border-none text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-base disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <button
                id="shorten-button"
                type="submit"
                disabled={isLoading || !longUrl.trim()}
                className="bg-indigo-600 text-white px-8 py-4 sm:py-5 rounded-xl font-bold text-base sm:text-lg hover:bg-indigo-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Shortening...</span>
                  </>
                ) : (
                  <span>Shorten URL</span>
                )}
              </button>
            </form>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div
              id="error-banner"
              role="alert"
              className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Result Section */}
          {shortUrl && (
            <div
              id="result-section"
              className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.2em] font-bold text-slate-400">
                Your generated short URL
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
                <div className="flex-grow bg-slate-50 px-5 py-3.5 sm:px-6 sm:py-4 rounded-xl border border-slate-100 flex items-center justify-between min-w-0">
                  <a
                    id="short-url-link"
                    href={shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lg sm:text-xl font-mono font-medium text-indigo-600 hover:text-indigo-800 transition-colors truncate flex items-center gap-2"
                    title={shortUrl}
                  >
                    <span className="truncate">{shortUrl}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0 opacity-70" />
                  </a>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider hidden sm:inline-block ml-3 flex-shrink-0">
                    Active
                  </span>
                </div>

                <button
                  id="copy-button"
                  type="button"
                  onClick={handleCopy}
                  className={`px-7 py-3.5 sm:py-4 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap text-base ${
                    copied
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                      : 'bg-slate-900 text-white hover:bg-black active:scale-[0.99] shadow-md shadow-slate-300'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Geometric Balance Footer with System Specs */}
      <footer className="w-full px-6 sm:px-12 py-6 sm:py-8 bg-white border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
        <div className="space-y-1 sm:space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Architecture
          </div>
          <div className="text-sm font-semibold text-slate-800">
            Express + PostgreSQL
          </div>
        </div>
        <div className="space-y-1 sm:space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            ORM
          </div>
          <div className="text-sm font-semibold text-slate-800">
            Prisma Client v5
          </div>
        </div>
        <div className="space-y-1 sm:space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Validation
          </div>
          <div className="text-sm font-semibold text-slate-800">
            Zod Schema
          </div>
        </div>
        <div className="space-y-1 sm:space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Performance
          </div>
          <div className="text-sm font-semibold text-emerald-600">
            &lt; 50ms Redirect
          </div>
        </div>
      </footer>
    </div>
  );
}
