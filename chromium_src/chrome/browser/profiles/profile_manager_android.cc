/* Copyright (c) 2020 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "chrome/browser/profiles/profile_manager.h"

#define OnProfileAdded OnProfileAdded_ChromiumImpl
#include "../../../../../chrome/browser/profiles/profile_manager.cc"
#undef OnProfileAdded

namespace {
  void SetCustomPreferences(Profile *profile) {
    GetPrefs()->SetBoolean(prefs::kSigninAllowed, false);
  }
}

void ProfileManagerAndroid::OnProfileAdded(Profile* profile) {
  OnProfileAdded_ChromiumImpl();
  SetCustomPreferences(profile);
}
