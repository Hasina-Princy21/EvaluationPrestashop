import { create } from 'zustand';

interface AuthState {
	isAuthenticated: boolean;
	isAdmin: boolean;
	login: (email: string, password: string) => boolean;
	logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	isAuthenticated: !!localStorage.getItem('adminToken'),
	isAdmin: !!localStorage.getItem('adminToken'),
	login: (email: string, password: string) => {
		// Simple authentication - in production use proper backend
		if (email && password) {
			localStorage.setItem('adminToken', 'true');
			localStorage.setItem('adminUser', email);
			set({ isAuthenticated: true, isAdmin: true });
			return true;
		}
		return false;
	},
	logout: () => {
		localStorage.removeItem('adminToken');
		localStorage.removeItem('adminUser');
		set({ isAuthenticated: false, isAdmin: false });
	},
}));
