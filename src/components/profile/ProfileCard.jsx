import { useNavigate } from 'react-router';
import { Pencil } from 'lucide-react';
import Avatar from '../ui/Avatar';

const ProfileCard = ({ user }) => {
  const navigate = useNavigate();
  const fullName = user ? `${user.first_name} ${user.last_name}` : 'User';
  const email = user?.email || 'No email';
  const handicap = user?.handicap !== null && user?.handicap !== undefined
    ? user.handicap
    : 'Not set';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-4 rounded-lg bg-white border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col gap-1 flex-[2_2_0px]">
          <p className="text-gray-900 text-base font-bold leading-tight">
            {fullName}
          </p>
          <p className="text-gray-500 text-sm font-normal leading-normal">
            {email} • Handicap: <span className="font-semibold text-primary">{handicap}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/profile/edit')}
          title="Change profile photo"
          aria-label="Change profile photo"
          className="relative rounded-full group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar userId={user?.id} size="lg" version={user?.updated_at} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/40 transition-colors">
            <Pencil className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </span>
        </button>
      </div>
    </div>
  );
};

export default ProfileCard;
