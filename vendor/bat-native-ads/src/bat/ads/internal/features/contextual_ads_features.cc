/* Copyright (c) 2020 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "bat/ads/internal/features/contextual_ads_features.h"

#include <iostream>

#include "base/feature_list.h"
#include "base/metrics/field_trial.h"
#include "base/metrics/field_trial_params.h"
#include "base/strings/stringprintf.h"
#include "bat/ads/internal/features/features.h"

namespace ads {
namespace features {

namespace {

const char kActiveTrial[] = "PageProbabilitiesHistoryStudy";
const uint64_t kDefaultPageProbabilitiesHistoryEntries = 5;

}  // namespace

// TODO(Moritz Haller): make sure everything works in the absence of a valid
// seed file
bool IsContextualAdsControlEnabled() {
  return base::FeatureList::IsEnabled(features::kContextualAdsControl);
}

uint32_t GetContextualAdsPageProbabilitiesHistorySize() {
  return GetFieldTrialParamByFeatureAsInt(
      features::kContextualAdsControl,
      "page_probabilities_history_entries",
      kDefaultPageProbabilitiesHistoryEntries);
}

std::string GetContextualAdsActiveTrialInfo() {
  std::string active_trial_info;

  base::FieldTrial* trial = base::FieldTrialList::Find(kActiveTrial);
  if (!trial) {
    return active_trial_info;
  }

  active_trial_info = base::StringPrintf("%s-%s-%i",
      trial->trial_name().c_str(), trial->group_name().c_str(),
      GetContextualAdsPageProbabilitiesHistorySize());

  return active_trial_info;
}

}  // namespace features
}  // namespace ads
