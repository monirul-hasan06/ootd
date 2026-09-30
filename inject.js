const fs = require('fs');

const appFile = 'App.tsx';
let content = fs.readFileSync(appFile, 'utf8');

// 1. Add imports
const imports = `import * as Calendar from 'expo-calendar';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
`;
content = content.replace("import * as Notifications from 'expo-notifications';", imports + "import * as Notifications from 'expo-notifications';");

// 2. Update screen type
content = content.split("useState<'home' | 'store'>('home');").join("useState<'home' | 'store' | 'wardrobe' | 'lookbook'>('home');");

// 3. Update FloatingNav definition
content = content.split("active: 'home' | 'store';").join("active: 'home' | 'store' | 'wardrobe' | 'lookbook';");
content = content.split("onNavigate: (screen: 'home' | 'store') => void;").join("onNavigate: (screen: 'home' | 'store' | 'wardrobe' | 'lookbook') => void;");

// Replace FloatingNav Body
const oldNav = `    const insets = useSafeAreaInsets();
    const homeActive = active === 'home';
    const storeActive = active === 'store';
    return (
        <View style={[s.floatingNav, { backgroundColor: theme.navBg, borderColor: theme.line, marginBottom: Math.max(insets.bottom, 8) }]}>
            <Pressable
                onPress={() => onNavigate('home')}
                style={({ pressed }) => [s.navTab, homeActive && [s.navTabActive, { backgroundColor: theme.accent }], pressed && { opacity: 0.7 }]}
                accessibilityRole="tab"
                accessibilityLabel={copy.home}
                accessibilityState={{ selected: homeActive }}
            >
                <Ionicons name={homeActive ? 'home' : 'home-outline'} size={20} color={homeActive ? theme.text : theme.muted} />
                <Text style={[s.navLabel, { color: homeActive ? theme.text : theme.muted, fontFamily: theme.bodyFont }]}>{copy.home}</Text>
            </Pressable>
            <Pressable
                onPress={() => onNavigate('store')}
                style={({ pressed }) => [s.navTab, storeActive && [s.navTabActive, { backgroundColor: theme.accent }], pressed && { opacity: 0.7 }]}
                accessibilityRole="tab"
                accessibilityLabel={copy.storeNav}
                accessibilityState={{ selected: storeActive }}
            >
                <Ionicons name={storeActive ? 'bag-handle' : 'bag-handle-outline'} size={20} color={storeActive ? theme.text : theme.muted} />
                <Text style={[s.navLabel, { color: storeActive ? theme.text : theme.muted, fontFamily: theme.bodyFont }]}>{copy.storeNav}</Text>
            </Pressable>
        </View>
    );`;

const newNav = `    const insets = useSafeAreaInsets();
    const tabs = [
        { id: 'home', icon: 'home', iconOut: 'home-outline', label: copy.home },
        { id: 'wardrobe', icon: 'shirt', iconOut: 'shirt-outline', label: 'Wardrobe' },
        { id: 'lookbook', icon: 'albums', iconOut: 'albums-outline', label: 'Lookbook' },
        { id: 'store', icon: 'bag-handle', iconOut: 'bag-handle-outline', label: copy.storeNav },
    ];
    return (
        <View style={[s.floatingNav, { backgroundColor: theme.navBg, borderColor: theme.line, marginBottom: Math.max(insets.bottom, 8) }]}>
            {tabs.map((tab) => {
                const isActive = active === tab.id;
                return (
                    <Pressable
                        key={tab.id}
                        onPress={() => onNavigate(tab.id as any)}
                        style={({ pressed }) => [s.navTab, isActive && [s.navTabActive, { backgroundColor: theme.accent }], pressed && { opacity: 0.7 }]}
                        accessibilityRole="tab"
                        accessibilityLabel={tab.label}
                        accessibilityState={{ selected: isActive }}
                    >
                        <Ionicons name={isActive ? tab.icon as any : tab.iconOut as any} size={20} color={isActive ? theme.text : theme.muted} />
                        <Text style={[s.navLabel, { color: isActive ? theme.text : theme.muted, fontFamily: theme.bodyFont }]}>{tab.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );`;

content = content.replace(oldNav, newNav);

// 4. Update ProductionHome to handle new screens
const wardrobeScreen = `
    if (screen === 'wardrobe') return (
        <SafeAreaView style={[s.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar style={profile.theme === 'dark' ? 'light' : 'dark'} />
            <View style={[s.container, { paddingTop: 40 }]}>
                <Text style={[s.sectionTitle, { color: theme.text, fontFamily: theme.font }]}>Digital Wardrobe</Text>
                <Text style={[{ color: theme.muted, fontFamily: theme.bodyFont, marginTop: 10 }]}>Your virtual closet.</Text>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="shirt-outline" size={64} color={theme.line} />
                    <Text style={[{ color: theme.muted, fontFamily: theme.bodyFont, marginTop: 10 }]}>Your wardrobe is empty.</Text>
                    <Pressable style={[{ backgroundColor: theme.text, padding: 15, borderRadius: 10, marginTop: 20 }]} onPress={() => ImagePicker.launchImageLibraryAsync()}>
                        <Text style={[{ color: theme.background, textAlign: 'center', fontFamily: theme.font }]}>Add Clothing Item</Text>
                    </Pressable>
                </View>
            </View>
            <FloatingNav active={screen} theme={theme} copy={copy} onNavigate={onNavigate} onEdit={onEdit} />
        </SafeAreaView>
    );
`;
const lookbookScreen = `
    if (screen === 'lookbook') return (
        <SafeAreaView style={[s.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar style={profile.theme === 'dark' ? 'light' : 'dark'} />
            <View style={[s.container, { paddingTop: 40 }]}>
                <Text style={[s.sectionTitle, { color: theme.text, fontFamily: theme.font }]}>Lookbook</Text>
                <Text style={[{ color: theme.muted, fontFamily: theme.bodyFont, marginTop: 10 }]}>Your saved styles.</Text>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="images-outline" size={64} color={theme.line} />
                    <Text style={[{ color: theme.muted, fontFamily: theme.bodyFont, marginTop: 10 }]}>No saved looks yet.</Text>
                </View>
            </View>
            <FloatingNav active={screen} theme={theme} copy={copy} onNavigate={onNavigate} onEdit={onEdit} />
        </SafeAreaView>
    );
`;

content = content.replace("    if (screen === 'store')", wardrobeScreen + lookbookScreen + "    if (screen === 'store')");

// 5. Add Share Button to Outfit Card
const originalExpand = `<Pressable onPress={() => setDetails(true)} hitSlop={12}>
                                <Ionicons name="expand-outline" size={20} color={theme.muted} />
                            </Pressable>`;
const shareButton = `
                            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                                <Pressable style={{ padding: 10 }} onPress={async () => {
                                    if (await Sharing.isAvailableAsync()) {
                                        Sharing.shareAsync('https://example.com/ootd-outfit', { dialogTitle: 'Check out my OOTD!' });
                                    }
                                }}>
                                    <Ionicons name="share-outline" size={20} color={theme.muted} />
                                </Pressable>
                                <Pressable onPress={() => setDetails(true)} hitSlop={12} style={{marginLeft: 10}}>
                                    <Ionicons name="expand-outline" size={20} color={theme.muted} />
                                </Pressable>
                            </View>`;
content = content.replace(originalExpand, shareButton);


fs.writeFileSync(appFile, content, 'utf8');
console.log('App.tsx updated successfully.');
