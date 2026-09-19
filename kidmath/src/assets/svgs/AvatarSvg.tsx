// 卡通头像（纯 SVG，8 选 1），可叠加装扮饰品
import type { AvatarId } from '../../constants/games'
import type { ItemSlot } from '../../types'

interface Props {
  avatar: string
  size?: number
  equipped?: Partial<Record<ItemSlot, string | null>>
  className?: string
}

const PALETTES: Record<AvatarId, { fur: string; fur2: string; ear: string }> = {
  cat: { fur: '#f7b955', fur2: '#f29e38', ear: '#f7b955' },
  bear: { fur: '#b98456', fur2: '#9c6a41', ear: '#b98456' },
  rabbit: { fur: '#f4f1ec', fur2: '#e2dcd2', ear: '#f4f1ec' },
  fox: { fur: '#ef8448', fur2: '#d96a32', ear: '#ef8448' },
  panda: { fur: '#ffffff', fur2: '#dfe3ea', ear: '#2b2140' },
  owl: { fur: '#9b7bd8', fur2: '#7c5cc0', ear: '#9b7bd8' },
  frog: { fur: '#79c96b', fur2: '#57a84a', ear: '#79c96b' },
  duck: { fur: '#ffd84d', fur2: '#f5bd21', ear: '#ffd84d' },
}

export function AvatarSvg({ avatar, size = 96, equipped, className }: Props) {
  const id = (avatar as AvatarId) in PALETTES ? (avatar as AvatarId) : 'cat'
  const c = PALETTES[id]
  const hat = equipped?.hat
  const glasses = equipped?.glasses
  const pet = equipped?.pet

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label={`头像 ${id}`}
    >
      {/* 背景饰品 */}
      {equipped?.background === 'bg_sky' && (
        <>
          <circle cx="60" cy="60" r="60" fill="#bfe6ff" />
          <circle cx="90" cy="26" r="12" fill="#fff3b0" />
        </>
      )}
      {equipped?.background === 'bg_rainbow' && (
        <>
          <rect width="120" height="120" fill="#eaf7ff" />
          {['#ef5b5b', '#ff9f43', '#ffc93c', '#46b65c', '#2ea8e6', '#8b6fd6'].map(
            (col, i) => (
              <path
                key={col}
                d={`M ${-10 + i * 4} 100 A ${70 - i * 7} ${70 - i * 7} 0 0 1 ${
                  130 - i * 4
                } 100`}
                fill="none"
                stroke={col}
                strokeWidth="7"
              />
            ),
          )}
        </>
      )}
      {equipped?.background === 'bg_space' && (
        <>
          <rect width="120" height="120" fill="#201a4a" />
          {[
            [20, 24, 2.4],
            [98, 20, 1.8],
            [100, 70, 2.2],
            [28, 86, 1.6],
            [60, 14, 1.6],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#fff6b0" />
          ))}
        </>
      )}
      {!equipped?.background && <circle cx="60" cy="60" r="60" fill="#eef4ff" />}

      {/* 耳朵 */}
      {(id === 'cat' || id === 'fox') && (
        <>
          <path d="M28 38 L20 8 L52 22 Z" fill={c.ear} />
          <path d="M92 38 L100 8 L68 22 Z" fill={c.ear} />
          <path d="M32 32 L27 15 L46 24 Z" fill="#ffd9c2" />
          <path d="M88 32 L93 15 L74 24 Z" fill="#ffd9c2" />
        </>
      )}
      {id === 'bear' && (
        <>
          <circle cx="30" cy="30" r="15" fill={c.ear} />
          <circle cx="90" cy="30" r="15" fill={c.ear} />
          <circle cx="30" cy="30" r="7" fill="#f0d3b8" />
          <circle cx="90" cy="30" r="7" fill="#f0d3b8" />
        </>
      )}
      {id === 'rabbit' && (
        <>
          <ellipse cx="42" cy="20" rx="10" ry="22" fill={c.ear} />
          <ellipse cx="78" cy="20" rx="10" ry="22" fill={c.ear} />
          <ellipse cx="42" cy="22" rx="4.5" ry="14" fill="#ffc9d6" />
          <ellipse cx="78" cy="22" rx="4.5" ry="14" fill="#ffc9d6" />
        </>
      )}
      {id === 'panda' && (
        <>
          <circle cx="30" cy="28" r="14" fill="#2b2140" />
          <circle cx="90" cy="28" r="14" fill="#2b2140" />
        </>
      )}
      {id === 'owl' && (
        <>
          <path d="M32 22 L42 8 L50 26 Z" fill={c.fur2} />
          <path d="M88 22 L78 8 L70 26 Z" fill={c.fur2} />
        </>
      )}
      {id === 'frog' && (
        <>
          <circle cx="34" cy="30" r="14" fill={c.fur} />
          <circle cx="86" cy="30" r="14" fill={c.fur} />
        </>
      )}
      {id === 'duck' && null}

      {/* 脸 */}
      <circle cx="60" cy="64" r="40" fill={c.fur} />
      {id === 'fox' && <path d="M38 64 A22 22 0 0 0 82 64 L60 92 Z" fill="#fff7ef" />}
      {id === 'panda' && <ellipse cx="60" cy="78" rx="24" ry="18" fill="#fff" />}
      {id === 'owl' && <ellipse cx="60" cy="76" rx="22" ry="20" fill="#f3ecff" />}
      {id === 'duck' && <ellipse cx="60" cy="80" rx="22" ry="15" fill="#fff6da" />}

      {/* 眼睛 */}
      {id === 'frog' ? (
        <>
          <circle cx="34" cy="30" r="7" fill="#fff" />
          <circle cx="86" cy="30" r="7" fill="#fff" />
          <circle cx="35" cy="31" r="3.6" fill="#2b2140" />
          <circle cx="87" cy="31" r="3.6" fill="#2b2140" />
        </>
      ) : id === 'owl' ? (
        <>
          <circle cx="46" cy="56" r="13" fill="#fff" />
          <circle cx="74" cy="56" r="13" fill="#fff" />
          <circle cx="48" cy="58" r="6" fill="#2b2140" />
          <circle cx="72" cy="58" r="6" fill="#2b2140" />
        </>
      ) : (
        <>
          <circle cx="46" cy="60" r="6.5" fill="#2b2140" />
          <circle cx="74" cy="60" r="6.5" fill="#2b2140" />
          <circle cx="48" cy="58" r="2.2" fill="#fff" />
          <circle cx="76" cy="58" r="2.2" fill="#fff" />
        </>
      )}

      {/* 眼镜饰品 */}
      {(glasses === 'glasses_star' || glasses === 'glasses_round' || glasses === 'glasses_sun') && (
        <g>
          <circle
            cx="46"
            cy="60"
            r="11"
            fill={glasses === 'glasses_sun' ? 'rgba(30,30,40,0.75)' : 'rgba(255,255,255,0.18)'}
            stroke={glasses === 'glasses_star' ? '#ffc93c' : '#333'}
            strokeWidth="3"
          />
          <circle
            cx="74"
            cy="60"
            r="11"
            fill={glasses === 'glasses_sun' ? 'rgba(30,30,40,0.75)' : 'rgba(255,255,255,0.18)'}
            stroke={glasses === 'glasses_star' ? '#ffc93c' : '#333'}
            strokeWidth="3"
          />
          <line x1="57" y1="60" x2="63" y2="60" stroke="#333" strokeWidth="3" />
        </g>
      )}

      {/* 鼻子/嘴 */}
      {id === 'cat' && (
        <>
          <path d="M56 72 L60 77 L64 72 Z" fill="#e06a7d" />
          <path d="M60 77 Q54 84 48 80 M60 77 Q66 84 72 80" fill="none" stroke="#2b2140" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {id === 'bear' && (
        <>
          <ellipse cx="60" cy="74" rx="9" ry="7" fill="#f0d3b8" />
          <ellipse cx="60" cy="72" rx="4" ry="3" fill="#2b2140" />
          <path d="M60 79 Q54 85 49 82 M60 79 Q66 85 71 82" fill="none" stroke="#2b2140" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {id === 'rabbit' && (
        <>
          <path d="M57 72 L60 76 L63 72 Z" fill="#ff9eb2" />
          <path d="M60 76 Q55 82 50 79 M60 76 Q65 82 70 79" fill="none" stroke="#2b2140" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {id === 'fox' && <path d="M55 74 L60 80 L65 74 Z" fill="#2b2140" />}
      {id === 'panda' && (
        <>
          <ellipse cx="60" cy="76" rx="5" ry="4" fill="#2b2140" />
          <path d="M60 80 Q55 86 50 83 M60 80 Q65 86 70 83" fill="none" stroke="#2b2140" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {id === 'owl' && <path d="M55 70 L65 70 L60 78 Z" fill="#e0a23c" />}
      {id === 'frog' && <path d="M50 78 Q60 88 70 78" fill="none" stroke="#2f6e2a" strokeWidth="3" strokeLinecap="round" />}
      {id === 'duck' && (
        <>
          <path d="M52 72 Q60 84 68 72 Z" fill="#ff8a3d" />
          <circle cx="46" cy="62" r="5.5" fill="#2b2140" />
          <circle cx="74" cy="62" r="5.5" fill="#2b2140" />
        </>
      )}

      {/* 帽子饰品 */}
      {hat === 'hat_party' && (
        <g>
          <path d="M44 26 L60 -6 L76 26 Z" fill="#8b6fd6" />
          <rect x="38" y="24" width="44" height="8" rx="4" fill="#ffc93c" />
          <circle cx="60" cy="-4" r="6" fill="#46b65c" />
        </g>
      )}
      {hat === 'hat_crown' && (
        <path d="M38 30 L46 8 L60 22 L74 8 L82 30 Z" fill="#ffc93c" stroke="#e0a800" strokeWidth="2.5" />
      )}
      {hat === 'hat_cap' && (
        <g>
          <path d="M34 34 A28 20 0 0 1 86 34 Z" fill="#2ea8e6" />
          <path d="M60 18 L92 36 L86 40 L60 30 Z" fill="#1f7fb8" />
        </g>
      )}

      {/* 宠物 */}
      {pet && (
        <g>
          {pet === 'pet_dog' && (
            <g transform="translate(86 84)">
              <ellipse cx="0" cy="10" rx="16" ry="12" fill="#c9945f" />
              <ellipse cx="0" cy="-2" rx="10" ry="9" fill="#dba978" />
              <ellipse cx="-6" cy="-3" rx="3.4" ry="4.6" fill="#8a5a2e" />
              <circle cx="-3.5" cy="-3" r="1.6" fill="#2b2140" />
              <circle cx="3.5" cy="-3" r="1.6" fill="#2b2140" />
              <ellipse cx="0" cy="1" rx="2" ry="1.5" fill="#2b2140" />
            </g>
          )}
          {pet === 'pet_cat' && (
            <g transform="translate(86 84)">
              <ellipse cx="0" cy="10" rx="15" ry="11" fill="#9aa7b8" />
              <ellipse cx="0" cy="-2" rx="9.5" ry="8.5" fill="#b9c4d2" />
              <path d="M-7 -8 L-9 -15 L-3 -10 Z" fill="#9aa7b8" />
              <path d="M7 -8 L9 -15 L3 -10 Z" fill="#9aa7b8" />
              <circle cx="-3.2" cy="-3" r="1.6" fill="#2b2140" />
              <circle cx="3.2" cy="-3" r="1.6" fill="#2b2140" />
              <path d="M-2 1 L0 3 L2 1 Z" fill="#e06a7d" />
            </g>
          )}
          {pet === 'pet_dino' && (
            <g transform="translate(86 82)">
              <ellipse cx="0" cy="12" rx="17" ry="12" fill="#7ac142" />
              <circle cx="2" cy="-2" r="9" fill="#8fd459" />
              <path d="M-2 -10 L1 -16 L4 -10 Z" fill="#57a84a" />
              <circle cx="-1" cy="-3" r="1.8" fill="#2b2140" />
              <circle cx="5.5" cy="-3" r="1.8" fill="#2b2140" />
            </g>
          )}
        </g>
      )}
    </svg>
  )
}
