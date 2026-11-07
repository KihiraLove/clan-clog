import { gameModeIcon, gameModeLabel, type GameMode } from '@clog/domain';

export function CollectorName({
  name,
  gameMode,
}: {
  name: string;
  gameMode: GameMode | null;
}) {
  const icon = gameModeIcon(gameMode);
  return (
    <span className="collector-name">
      {icon && (
        <img
          className="collector-helmet"
          src={icon}
          alt={gameModeLabel(gameMode)}
        />
      )}
      <span>{name}</span>
    </span>
  );
}
