import type { Photographer } from '../types';
import type { ChatTarget } from '../lib/chat';
import type { PhotoRequest } from '../lib/photoRequests';

export type RootTab = 'home' | 'search' | 'bookings' | 'messages' | 'profile';
export type ProfileDestination =
  | 'personal'
  | 'my-requests'
  | 'application'
  | 'notifications'
  | 'password'
  | 'email'
  | 'delete'
  | 'admin';
export type Route =
  | { name: RootTab | ProfileDestination | 'requests' | 'create-request' }
  | { name: 'photographer' | 'booking'; photographer: Photographer }
  | { name: 'booking-detail'; bookingId: string }
  | { name: 'chat'; chat: ChatTarget }
  | { name: 'request'; request: PhotoRequest };

export const ROOT_TABS: { id: RootTab; title: string; icon: string }[] = [
  { id: 'home', title: 'Trang chủ', icon: '⌂' },
  { id: 'search', title: 'Khám phá', icon: '⌕' },
  { id: 'bookings', title: 'Lịch hẹn', icon: '▦' },
  { id: 'messages', title: 'Tin nhắn', icon: '✉' },
  { id: 'profile', title: 'Hồ sơ', icon: '○' },
];
