"use client";

import React, { useState } from 'react';
import {
  Upload,
  FileText,
  Image,
  Link as LinkIcon,
  Sparkles,
  Clipboard,
  Check
} from 'lucide-react';

// 分析結果の型定義
interface GenerationResult {
  title: string;
  description: string;
}

export default function TitleDescGenerator() {
  const [inputType, setInputType] = useState('text');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copied, setCopied] = useState<'title' | 'description' | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setUploadedImage(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('inputType', inputType);
      formData.append('language', 'ja'); // 言語は日本語に固定

      if (inputType === 'text') {
        formData.append('content', content);
      } else if (inputType === 'url') {
        formData.append('url', url);
      } else if (inputType === 'image' && uploadedFile) {
        formData.append('image', uploadedFile);
      } else {
        throw new Error("生成元のコンテンツがありません。");
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'サーバーで不明なエラーが発生しました。');
      }
      
      setResult(responseData);

    } catch (err: any) {
      console.error('生成エラー:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleCopy = (text: string, type: 'title' | 'description') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  const isButtonDisabled = isGenerating || (inputType === 'text' && !content) || (inputType === 'url' && !url) || (inputType === 'image' && !uploadedFile);
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-2">
            <Sparkles className="w-10 h-10 text-amber-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-300 to-orange-300 bg-clip-text text-transparent">
              AIタイトル&ディスクリプション生成
            </h1>
          </div>
          <p className="text-slate-300 text-lg">最適なSEOタイトルとディスクリプションをAIが提案します</p>
        </header>

        <main className="space-y-8">
          {/* 入力フォームコンテナ */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-xl p-6 space-y-6">
            <p className="text-slate-400">1. 生成元のコンテンツを入力してください</p>
            <div className="flex flex-wrap gap-4">
              {/* 分析方法選択 */}
              <button onClick={() => setInputType('text')} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${inputType === 'text' ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}><FileText size={18}/>テキスト入力</button>
              <button onClick={() => setInputType('url')} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${inputType === 'url' ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}><LinkIcon size={18}/>URL解析</button>
              <button onClick={() => setInputType('image')} className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${inputType === 'image' ? 'bg-amber-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}><Image size={18}/>画像分析</button>
            </div>

            {/* 各入力フォーム */}
            {inputType === 'text' && (
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="ブログ記事の本文などをここに貼り付け..." rows={10} className="w-full p-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-amber-500 outline-none resize-y"></textarea>
            )}
            {inputType === 'url' && <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/blog/article" className="w-full p-3 bg-slate-700 rounded-lg border border-slate-600 focus:ring-2 focus:ring-amber-500 outline-none" />}
            {inputType === 'image' && (
                <div className="text-center p-6 border-2 border-dashed border-slate-600 rounded-lg hover:bg-slate-700/50 transition">
                    <label htmlFor="imageUpload" className="cursor-pointer">
                        <Upload className="w-12 h-12 mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-300">記事のスクリーンショットなどをアップロード</p>
                        <input id="imageUpload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {uploadedImage && <img src={uploadedImage} alt="Preview" className="mt-4 max-w-xs mx-auto rounded-lg" />}
                </div>
            )}
            
            <div className="text-center">
              <button onClick={handleGenerate} disabled={isButtonDisabled} className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none">
                {isGenerating ? "AIが生成中..." : "タイトルとディスクリプションを生成"}
              </button>
            </div>
          </div>

          {/* エラー表示 */}
          {error && <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg text-center">{error}</div>}

          {/* 生成結果 */}
          {result && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl shadow-xl p-6 space-y-6">
              <h2 className="text-2xl font-bold text-slate-200 text-center">AIによる生成結果</h2>
              
              {/* 生成されたタイトル */}
              <div className="space-y-2">
                <label className="text-lg font-semibold text-amber-300">タイトル案</label>
                <div className="relative">
                  <p className="w-full p-4 pr-12 bg-slate-900/70 rounded-lg border border-slate-600 text-slate-100">{result.title}</p>
                  <button onClick={() => handleCopy(result.title, 'title')} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-white transition">
                    {copied === 'title' ? <Check size={20} className="text-green-400"/> : <Clipboard size={20} />}
                  </button>
                </div>
              </div>

              {/* 生成されたディスクリプション */}
               <div className="space-y-2">
                <label className="text-lg font-semibold text-amber-300">メタディスクリプション案</label>
                <div className="relative">
                  <p className="w-full p-4 pr-12 bg-slate-900/70 rounded-lg border border-slate-600 text-slate-100">{result.description}</p>
                   <button onClick={() => handleCopy(result.description, 'description')} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-white transition">
                    {copied === 'description' ? <Check size={20} className="text-green-400"/> : <Clipboard size={20} />}
                  </button>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}