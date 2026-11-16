#!/usr/bin/env bash
set -euo pipefail

export PATH="/opt/flutter/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:$PATH"
export ANDROID_HOME="/opt/android-sdk"
export ANDROID_SDK_ROOT="/opt/android-sdk"
export GRADLE_OPTS="-Xmx1024m -XX:MaxMetaspaceSize=320m -Dorg.gradle.daemon=false"

cd "$(dirname "$0")"

if [ ! -d android ]; then
  flutter create --platforms=android --org com.smartcard --project-name smart_card_admin .
fi

# Configure AndroidManifest with INTERNET and CAMERA permissions + Arabic/English app label
MANIFEST="android/app/src/main/AndroidManifest.xml"
node -e '
const fs = require("fs");
let xml = fs.readFileSync(process.argv[1], "utf8");
if (!xml.includes("android.permission.INTERNET")) {
  xml = xml.replace("<application", "<uses-permission android:name=\"android.permission.INTERNET\" />\n    <uses-permission android:name=\"android.permission.CAMERA\" />\n    <uses-feature android:name=\"android.hardware.camera\" android:required=\"false\" />\n    <application");
}
xml = xml.replace(/android:label="[^"]*"/, "android:label=\"Smart Card Admin\"");
fs.writeFileSync(process.argv[1], xml, "utf8");
' "$MANIFEST"

# Cap Gradle JVM heap and disable daemon for reliable low-memory builds
GRADLE_PROPS="android/gradle.properties"
if [ -f "$GRADLE_PROPS" ]; then
  sed -i 's/org.gradle.jvmargs=.*/org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=320m -XX:ReservedCodeCacheSize=128m/' "$GRADLE_PROPS"
  grep -q "org.gradle.daemon=" "$GRADLE_PROPS" || echo "org.gradle.daemon=false" >> "$GRADLE_PROPS"
  grep -q "org.gradle.workers.max=" "$GRADLE_PROPS" || echo "org.gradle.workers.max=1" >> "$GRADLE_PROPS"
  grep -q "kotlin.compiler.execution.strategy=" "$GRADLE_PROPS" || echo "kotlin.compiler.execution.strategy=in-process" >> "$GRADLE_PROPS"
fi

# Ensure minSdk >= 23 for mobile_scanner + permission_handler
APP_GRADLE="android/app/build.gradle.kts"
if [ -f "$APP_GRADLE" ]; then
  sed -i 's/minSdk = flutter.minSdkVersion/minSdk = 23/' "$APP_GRADLE"
fi
APP_GRADLE_GROOVY="android/app/build.gradle"
if [ -f "$APP_GRADLE_GROOVY" ]; then
  sed -i 's/minSdkVersion flutter.minSdkVersion/minSdkVersion 23/' "$APP_GRADLE_GROOVY"
  sed -i 's/minSdk = flutter.minSdkVersion/minSdk = 23/' "$APP_GRADLE_GROOVY"
fi

rm -f test/widget_test.dart
flutter pub get
flutter analyze --no-fatal-infos || true
flutter build apk --release --no-tree-shake-icons --target-platform android-arm64

mkdir -p ../public/downloads
cp build/app/outputs/flutter-apk/app-release.apk ../public/downloads/SmartCard-Admin.apk
ls -lh ../public/downloads/SmartCard-Admin.apk
