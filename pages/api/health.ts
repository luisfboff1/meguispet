import type { NextApiRequest, NextApiResponse} from 'next';
import { getSupabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('usuarios').select('id').limit(1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'API health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
