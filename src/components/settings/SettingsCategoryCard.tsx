import { SettingsIcon, type SettingsIconName } from './SettingsIcon';

type SettingsTone = 'purple' | 'green' | 'orange' | 'red' | 'blue';

type SettingsCategoryCardProps = {
  icon: SettingsIconName;
  title: string;
  description: string;
  tags: string[];
  tone?: SettingsTone;
};

export function SettingsCategoryCard({
  icon,
  title,
  description,
  tags,
  tone = 'purple',
}: SettingsCategoryCardProps) {
  return (
    <article className="settings-category-card">
      <header>
        <span className={`settings-card-icon ${tone}`}><SettingsIcon name={icon} /></span>
        <div><h2>{title}</h2><p>{description}</p></div>
      </header>
      <div className={`settings-card-tags ${tone}`}>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      <button type="button">관리하기 <span>›</span></button>
    </article>
  );
}
