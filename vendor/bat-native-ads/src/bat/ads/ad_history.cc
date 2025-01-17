/* Copyright (c) 2019 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "bat/ads/ad_history.h"

#include "bat/ads/internal/logging.h"
#include "bat/ads/internal/time_util.h"
#include "bat/ads/internal/json_helper.h"

namespace ads {

AdHistory::AdHistory() = default;

AdHistory::AdHistory(
    const AdHistory& properties) = default;

AdHistory::~AdHistory() = default;

bool AdHistory::operator==(
    const AdHistory& rhs) const {
  return timestamp_in_seconds == rhs.timestamp_in_seconds &&
      ad_content == rhs.ad_content &&
      category_content == rhs.category_content;
}

bool AdHistory::operator!=(
    const AdHistory& rhs) const {
  return !(*this == rhs);
}

std::string AdHistory::ToJson() const {
  std::string json;
  SaveToJson(*this, &json);
  return json;
}

Result AdHistory::FromJson(
    const std::string& json) {
  rapidjson::Document document;
  document.Parse(json.c_str());

  if (document.HasParseError()) {
    BLOG(1, helper::JSON::GetLastError(&document));
    return FAILED;
  }

  if (document.HasMember("timestamp_in_seconds")) {
    auto migrated_timestamp_in_seconds =
        MigrateTimestampToDoubleT(document["timestamp_in_seconds"].GetUint64());
    timestamp_in_seconds = migrated_timestamp_in_seconds;
  }

  if (document.HasMember("ad_content")) {
    rapidjson::StringBuffer buffer;
    rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
    const auto& value = document["ad_content"];
    if (!value.Accept(writer) ||
        ad_content.FromJson(buffer.GetString()) != SUCCESS) {
      return FAILED;
    }
  }

  if (document.HasMember("category_content")) {
    rapidjson::StringBuffer buffer;
    rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
    const auto& value = document["category_content"];
    if (!value.Accept(writer) ||
        category_content.FromJson(buffer.GetString()) != SUCCESS) {
      return FAILED;
    }
  }

  return SUCCESS;
}

void SaveToJson(JsonWriter* writer, const AdHistory& history) {
  writer->StartObject();

  writer->String("timestamp_in_seconds");
  writer->Uint64(history.timestamp_in_seconds);

  writer->String("ad_content");
  SaveToJson(writer, history.ad_content);

  writer->String("category_content");
  SaveToJson(writer, history.category_content);

  writer->EndObject();
}

}  // namespace ads
