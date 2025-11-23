import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const supabaseEdgeFunctionUrl = 'https://aexlptrufyeyrhkvndzi.supabase.co/functions/v1/campaign-scheduler';
      const response = await fetch(supabaseEdgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Não é necessário body para o scheduler, mas pode ser enviado um objeto vazio se a função Edge esperar um JSON.
        body: JSON.stringify({}), 
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao invocar a função Edge do Supabase:', errorData);
        return res.status(response.status).json({ error: 'Failed to invoke Supabase Edge Function', details: errorData });
      }

      const data = await response.json();
      return res.status(200).json({ message: 'Supabase Edge Function invoked successfully', data });
    } catch (error: unknown) {
      console.error('Erro no Vercel Cron Job:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: 'Internal Server Error', details: errorMessage });
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
}