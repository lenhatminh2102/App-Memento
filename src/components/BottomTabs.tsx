import { Pressable, Text, View } from 'react-native';
import { ROOT_TABS, type RootTab } from '../navigation/routes';
import { colors, s } from '../ui';

export function BottomTabs({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (tab: RootTab) => void;
}) {
  return (
    <View style={s.tabs}>
      {ROOT_TABS.map((tab) => {
        const color = selected === tab.id ? colors.mint : colors.muted;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: selected === tab.id }}
            onPress={() => onSelect(tab.id)}
            style={s.tab}
          >
            <Text style={{ fontSize: 24, color }}>{tab.icon}</Text>
            <Text style={{ fontSize: 10, fontWeight: '700', color }}>{tab.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
