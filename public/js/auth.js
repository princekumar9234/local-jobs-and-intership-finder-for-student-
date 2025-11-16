// Shared Supabase authentication utility
// Initialize Supabase client
const supabaseUrl = 'https://anhstuyagypchntxujrq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuaHN0dXlhZ3lwY2hudHh1anJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMzA2MDEsImV4cCI6MjA3ODgwNjYwMX0.mZwhowUemXQnNYR3cudtlmICiO2EcwzQfm1NZYWK8q8';

// Check if Supabase is loaded
if (typeof window.supabase !== 'undefined') {
  window.supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
} else {
  console.error('Supabase library not loaded. Please include the Supabase CDN script.');
}

// Authentication utility functions
const AuthUtils = {
  // Get current user
  async getCurrentUser() {
    if (!window.supabaseClient) return null;
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    return user;
  },

  // Get current session
  async getSession() {
    if (!window.supabaseClient) return null;
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    return session;
  },

  // Logout
  async logout() {
    if (!window.supabaseClient) return false;
    const { error } = await window.supabaseClient.auth.signOut();
    if (!error) {
      window.location.href = '/login.html';
      return true;
    }
    return false;
  },

  // Check if user is authenticated
  async isAuthenticated() {
    const session = await this.getSession();
    return session !== null;
  }
};

// Make AuthUtils globally available
window.AuthUtils = AuthUtils;

