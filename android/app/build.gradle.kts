plugins {
    id("com.android.application")
}

// The live site the app opens. Must match public/.well-known/assetlinks.json on that site.
val siteHost = "diet-plans-latest.vercel.app"

android {
    namespace = "com.dietways.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.dietways.app"
        minSdk = 21
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        manifestPlaceholders["hostName"] = siteHost
        resValue("string", "launchUrl", "https://$siteHost/")
        resValue("string", "siteUrl", "https://$siteHost")
    }

    // The signing key's fingerprint is published in assetlinks.json; that is what removes
    // Chrome's address bar. CI reads it from repo secrets; locally from env vars.
    signingConfigs {
        create("release") {
            val ks = System.getenv("DIETWAYS_KEYSTORE")
            if (ks != null) {
                storeFile = file(ks)
                storePassword = System.getenv("DIETWAYS_KEYSTORE_PASSWORD")
                keyAlias = "dietways"
                keyPassword = System.getenv("DIETWAYS_KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            signingConfig = signingConfigs.getByName("release").takeIf { it.storeFile != null }
                ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    // Trusted Web Activity launcher, splash screen and notification delegation.
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
}
