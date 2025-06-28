import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Tesseract from 'tesseract.js';

// --- Hugging Face API設定 ---
const AI_API_BASE = 'https://api-inference.huggingface.co/models';
const AI_MODEL = 'mistralai/Mixtral-8x7B-Instruct-v0.1'; 
const HF_API_KEY = process.env.HF_API_KEY;

/**
 * AIに単一のタスク（タイトルまたはディスクリプション）を指示する関数
 */
async function generateSinglePart(content: string, part: 'title' | 'description'): Promise<string> {
    // ★★★ 日本語での応答を強制する指示を追加 ★★★
    const titlePrompt = `[INST]あなたはプロのSEOコンサルタントです。以下の記事本文に最適な、30文字程度の短いタイトルを1つだけ、**必ず日本語で**考案してください。回答はタイトルのみとし、解説や前置き、記号（「」『』）は一切含めないでください。
# 記事本文
${content.substring(0, 2000)}[/INST]`;

    const descriptionPrompt = `[INST]あなたはプロのSEOコンサルタントです。以下の記事本文を120文字程度で要約し、読者が記事を読むメリットが伝わるような魅力的なメタディスクリプションを、**必ず日本語で**作成してください。回答はディスクリプションの文章のみとし、解説や前置き、記号（「」『』）は一切含めないでください。
# 記事本文
${content.substring(0, 2000)}[/INST]`;

    const prompt = part === 'title' ? titlePrompt : descriptionPrompt;

    try {
        const response = await axios.post(
            `${AI_API_BASE}/${AI_MODEL}`,
            { 
                inputs: prompt, 
                parameters: { max_new_tokens: part === 'title' ? 64 : 150, return_full_text: false } 
            },
            { 
                headers: { 'Authorization': `Bearer ${HF_API_KEY}` },
                timeout: 60000 
            }
        );

        let generatedText = response.data[0]?.generated_text || '';
        // 応答から余分な改行や空白を削除
        return generatedText.trim().replace(/^["「『]|["」『]$/g, '');

    } catch (error: any) {
        console.error(`AI Generation Error for ${part}:`, error.response?.data || error.message);
        const errorData = error.response?.data;
    
        if (error.response?.status === 401) throw new Error("Hugging Face APIの認証に失敗しました。APIキーが正しいか確認してください。");
        if (errorData?.error?.includes("is currently loading")) throw new Error(`AIモデルを準備中です。少し待ってからもう一度お試しください。`);
        if (error.code === 'ECONNABORTED') throw new Error("AIの応答がタイムアウトしました。サーバーが混み合っている可能性があります。");
        if (errorData?.error) throw new Error(`AI APIエラー: ${errorData.error}`);
    
        throw new Error(`AIによる${part}の生成中に予期せぬエラーが発生しました。`);
    }
}


// --- メインのAPIハンドラ ---
export async function POST(req: NextRequest) {
  if (!HF_API_KEY) {
    return NextResponse.json({ error: 'APIキーがサーバーに設定されていません。' }, { status: 500 });
  }

  const formData = await req.formData();
  const inputType = formData.get('inputType') as string;
  let content = '';
  
  try {
    if (inputType === 'text') {
        content = formData.get('content') as string;
    } else if (inputType === 'url') {
        try {
            const url = formData.get('url') as string;
            if (!url || !url.startsWith('http')) throw new Error('有効なURLを入力してください。');
            const { data: pageHtml } = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(pageHtml);
            $('script, style, nav, header, footer, aside').remove();
            content = $('body').text().replace(/\s\s+/g, ' ').trim();
        } catch (urlError: any) {
            throw new Error("URLからのコンテンツ取得に失敗しました。サイトが存在しないか、アクセスがブロックされている可能性があります。");
        }
    } else if (inputType === 'image') {
        try {
            const imageFile = formData.get('image') as File;
            if (!imageFile) throw new Error("画像ファイルがありません。");
            
            const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
            const worker = await Tesseract.createWorker('jpn');
            const { data: { text } } = await worker.recognize(imageBuffer);
            await worker.terminate();
            content = text;
        } catch(ocrError: any) {
            throw new Error("画像からのテキスト抽出（OCR）に失敗しました。");
        }
    }

    if (!content || content.trim().length < 50) {
        throw new Error("生成するにはコンテンツが短すぎます。50文字以上の日本語テキストを入力してください。");
    }

    // AIへの命令を2回に分割
    console.log("Generating title...");
    const title = await generateSinglePart(content, 'title');
    
    console.log("Generating description...");
    const description = await generateSinglePart(content, 'description');

    const generationResult = { title, description };
    return NextResponse.json(generationResult);

  } catch (error: any) {
    console.error('Critical Error in POST /api/analyze:', error.message);
    return NextResponse.json({ error: error.message || "不明なサーバーエラーです。" }, { status: 500 });
  }
}