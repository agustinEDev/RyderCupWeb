import Avatar from '../ui/Avatar';

const ProfileCard = ({ user }) => {
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
        <Avatar userId={user?.id} size="lg" version={user?.updated_at} />
      </div>
    </div>
  );
};

export default ProfileCard;
