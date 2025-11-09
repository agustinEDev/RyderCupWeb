import React from 'react';

const ProfileCard = ({ user }) => {
  const fullName = user ? `${user.first_name} ${user.last_name}` : 'User';
  const email = user?.email || 'No email';
  const handicap = user?.handicap !== null && user?.handicap !== undefined
    ? user.handicap
    : 'Not set';

  return (
    <div className="p-4">
      <div className="flex items-stretch justify-between gap-4 rounded-lg bg-white border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex flex-col gap-1 flex-[2_2_0px]">
          <p className="text-gray-900 text-base font-bold leading-tight">
            {fullName}
          </p>
          <p className="text-gray-500 text-sm font-normal leading-normal">
            {email} • Handicap: <span className="font-semibold text-primary">{handicap}</span>
          </p>
        </div>
        <div
          className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg flex-1"
          style={{
            backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCj4WSOg6hXDZFGfTANqHkzJ62WYpLEc5H1vBHazpEnoltPPQTBtna05CNSae1gjSi9SNT4OmM4Whhyu34JFxh-cAGDxiNa_GmgSglXdP4eGS6k0INHwrsGPrVJd9C3S8RssvatBLGz0oewnA2PzN8ZBNN0RIPjxbIt7v-vE1LAvTRSNGNpDyX5sQDwCcfQUF4uMa6fzlnda6-TdjvQuF_NqIyfSnPlcbV_9GwWTscPuUUKTXSJaD_Vs80qBxnaQKpfnZmIxNXgzwGt")`
          }}
        ></div>
      </div>
    </div>
  );
};

export default ProfileCard;
