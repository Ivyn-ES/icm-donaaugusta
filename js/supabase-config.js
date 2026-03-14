// ==========================================
// 1. CONFIGURAÇÃO E CONEXÃO (CENTRAL)
// ==========================================
const SUPABASE_URL = 'https://pxjczmjhzopfxwlmpjfv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4amN6bWpoem9wZnh3bG1wamZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MjUzMjYsImV4cCI6MjA4NzEwMTMyNn0.OfekQPuYUwsZu5X9_lPDGBbVTZYBvAQ5KdiFx3TFOCY';

// Inicializa o cliente globalmente
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("🔌 Conexão com Supabase estabelecida.");