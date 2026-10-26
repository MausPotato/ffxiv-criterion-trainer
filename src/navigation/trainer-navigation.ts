export type TrainerNavigationGroup = 'ketuduke' | 'lalaru';

export interface TrainerNavigationItem {
  id: string;
  label: string;
  to: string;
  showInNavigation?: boolean;
}

export const TRAINER_NAVIGATION_REGISTRY: Readonly<
  Record<TrainerNavigationGroup, readonly TrainerNavigationItem[]>
> = {
  ketuduke: [
    {
      id: 'queue-method',
      label: '第一機制：排隊法',
      to: '/aloalo-island/ketuduke'
    },
    {
      id: 'blowing-bubbles',
      label: '第二機制：吹氣泡預覽 →',
      to: '/aloalo-island/ketuduke/blowing-bubbles'
    }
  ],
  lalaru: [
    {
      id: 'rotation',
      label: '旋轉角乘算',
      to: '/aloalo-island/lalaru/rotation'
    },
    {
      id: 'composite-pattern',
      label: '複合魔紋',
      to: '/aloalo-island/lalaru/composite-pattern'
    },
    {
      id: 'analysis',
      label: '分析方向',
      to: '/aloalo-island/lalaru/analysis',
      showInNavigation: false
    },
    {
      id: 'planar-mines',
      label: '平面爆雷',
      to: '/aloalo-island/lalaru/planar-mines'
    },
    {
      id: 'spatial-bombs',
      label: '立體炸彈',
      to: '/aloalo-island/lalaru/spatial-bombs'
    }
  ]
};

export function trainerNavigationFor(
  group: TrainerNavigationGroup
): readonly TrainerNavigationItem[] {
  return TRAINER_NAVIGATION_REGISTRY[group].filter(item => item.showInNavigation !== false);
}
