import type { User } from '@supabase/supabase-js';
import type { Profile } from '../hooks/useProfile';
import type { useAppNavigation } from '../hooks/useAppNavigation';
import type { Route } from './routes';
import type { Photographer } from '../types';
import type { ChatTarget } from '../lib/chat';
import { Explore, PhotographerDetail } from '../screens/Explore';
import { BookingForm, Bookings } from '../screens/Bookings';
import BookingDetail from '../screens/BookingDetail';
import { Chat, Inbox, Notifications } from '../screens/Inbox';
import { CreateRequest, RequestDetail, Requests } from '../screens/Requests';
import { ChangePassword, PersonalInfo, ProfileMenu } from '../screens/Profile';
import { AccountAction } from '../screens/Account';
import Application from '../screens/Application';
import Admin from '../screens/Admin';
import { Body, Page } from '../ui';

type Props = {
  route: Route;
  user: User;
  profile: Profile;
  refreshProfile: () => void;
  navigation: ReturnType<typeof useAppNavigation>;
};

export function RouteView({ route, user, profile, refreshProfile, navigation }: Props) {
  const { navigate, reset, back } = navigation;
  const openPhotographer = (photographer: Photographer) =>
    navigate({ name: 'photographer', photographer });
  const openChat = (chat: ChatTarget) => navigate({ name: 'chat', chat });
  const showBookings = () => reset([{ name: 'bookings' }]);

  switch (route.name) {
    case 'home':
    case 'search':
      return (
        <Explore
          key={route.name}
          home={route.name === 'home'}
          open={openPhotographer}
          requests={() => navigate({ name: 'requests' })}
        />
      );
    case 'photographer':
      return (
        <PhotographerDetail
          photographer={route.photographer}
          book={() => navigate({ name: 'booking', photographer: route.photographer })}
        />
      );
    case 'booking':
      return <BookingForm photographer={route.photographer} userId={user.id} done={showBookings} />;
    case 'bookings':
      return (
        <Bookings
          userId={user.id}
          openChat={openChat}
          detail={(bookingId) => navigate({ name: 'booking-detail', bookingId })}
        />
      );
    case 'booking-detail':
      return <BookingDetail id={route.bookingId} userId={user.id} />;
    case 'messages':
      return <Inbox open={openChat} notifications={() => navigate({ name: 'notifications' })} />;
    case 'chat':
      return <Chat key={route.chat.id} target={route.chat} userId={user.id} />;
    case 'notifications':
      return <Notifications userId={user.id} />;
    case 'profile':
      return (
        <ProfileMenu profile={profile} email={user.email || ''} go={(name) => navigate({ name })} />
      );
    case 'personal':
      return (
        <PersonalInfo
          profile={profile}
          userId={user.id}
          done={() => {
            refreshProfile();
            back();
          }}
        />
      );
    case 'password':
      return <ChangePassword />;
    case 'email':
    case 'delete':
      return (
        <AccountAction
          action={route.name}
          email={user.email || ''}
          done={() => {
            refreshProfile();
            back();
          }}
        />
      );
    case 'application':
      return <Application userId={user.id} />;
    case 'admin':
      return profile.role === 'admin' ? (
        <Admin />
      ) : (
        <Page>
          <Body>Bạn không có quyền truy cập.</Body>
        </Page>
      );
    case 'requests':
    case 'my-requests':
      return (
        <Requests
          key={route.name}
          userId={user.id}
          mine={route.name === 'my-requests'}
          create={() => navigate({ name: 'create-request' })}
          open={(request) => navigate({ name: 'request', request })}
        />
      );
    case 'create-request':
      return (
        <CreateRequest
          name={profile.full_name || profile.username}
          done={() => reset([{ name: 'profile' }, { name: 'my-requests' }])}
        />
      );
    case 'request':
      return (
        <RequestDetail
          request={route.request}
          userId={user.id}
          photographer={profile.role === 'photographer'}
          done={showBookings}
        />
      );
  }
}
