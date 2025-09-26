'use client';

import { createContext } from 'react';
import { AuthContextValue } from '../types/auth';

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
