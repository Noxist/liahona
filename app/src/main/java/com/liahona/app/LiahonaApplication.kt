package com.liahona.app

import android.app.Application
import com.google.android.material.color.DynamicColors

class LiahonaApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        DynamicColors.applyToActivitiesIfAvailable(this)
    }
}
