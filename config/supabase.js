require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://anhstuyagypchntxujrq.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuaHN0dXlhZ3lwY2hudHh1anJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzA2MDEsImV4cCI6MjA3ODgwNjYwMX0.mZwhowUemXQnNYR3cudtlmICiO2EcwzQfm1NZYWK8q8';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;

