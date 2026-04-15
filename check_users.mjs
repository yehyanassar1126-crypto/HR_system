import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// read .env
const env = fs.readFileSync('.env', 'utf-8');
const lines = env.split('\n');
let url = '', key = '';
for(const line of lines) {
    if(line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if(line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
}

const supabase = createClient(url, key);

async function check() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error("Error:", error);
    else console.log("USERS:", JSON.stringify(data, null, 2));
}

check();
