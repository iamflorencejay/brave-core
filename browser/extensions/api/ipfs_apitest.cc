/* Copyright (c) 2019 The Brave Authors. All rights reserved.
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "base/files/file_util.h"
#include "base/path_service.h"
#include "base/test/scoped_feature_list.h"
#include "brave/browser/ipfs/ipfs_service_factory.h"
#include "brave/common/brave_paths.h"
#include "brave/common/pref_names.h"
#include "brave/components/ipfs/browser/features.h"
#include "brave/components/ipfs/browser/ipfs_service.h"
#include "brave/components/ipfs/common/ipfs_constants.h"
#include "brave/components/ipfs/common/pref_names.h"
#include "chrome/browser/extensions/extension_apitest.h"
#include "components/prefs/pref_service.h"
#include "content/public/test/browser_test.h"
#include "extensions/common/constants.h"
#include "extensions/test/result_catcher.h"

namespace extensions {
namespace {

// Actual config option string doesn't matter for tests
const char ipfs_config[] = "{ \"Identity\": {} }";

class IpfsExtensionApiTest : public ExtensionApiTest {
 public:
  IpfsExtensionApiTest() {
    feature_list_.InitAndEnableFeature(ipfs::features::kIpfsFeature);
  }
  void SetUp() override {
    brave::RegisterPathProvider();
    base::PathService::Get(brave::DIR_TEST_DATA, &extension_dir_);
    extension_dir_ = extension_dir_.AppendASCII("extensions/api_test");
    ExtensionApiTest::SetUp();
  }
  void WriteConfigToFile() {
    base::ScopedAllowBlockingForTesting allow_blocking;
    ipfs::IpfsService* service =
        ipfs::IpfsServiceFactory::GetInstance()->GetForContext(profile());
    base::FilePath path = service->GetConfigFilePath();
    ASSERT_TRUE(base::CreateDirectory(path.DirName()));
    ASSERT_TRUE(base::WriteFile(path, ipfs_config));
  }
  void TearDown() override { ExtensionApiTest::TearDown(); }
  PrefService* GetPrefs() { return browser()->profile()->GetPrefs(); }
  base::FilePath extension_dir_;
  base::test::ScopedFeatureList feature_list_;
};

IN_PROC_BROWSER_TEST_F(IpfsExtensionApiTest, IpfsCompanionHasAcces) {
  ResultCatcher catcher;
  const Extension* extension =
      LoadExtension(extension_dir_.AppendASCII("ipfsCompanion"));
  ASSERT_TRUE(extension);
  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id, "testBasics()"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;
}

IN_PROC_BROWSER_TEST_F(IpfsExtensionApiTest, ExecutableAvailChangeIsReflected) {
  ResultCatcher catcher;
  const Extension* extension =
      LoadExtension(extension_dir_.AppendASCII("ipfsCompanion"));
  ASSERT_TRUE(extension);
  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id,
      "executableAvailableChangeIsReflected(false)"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;

  GetPrefs()->SetBoolean(kIPFSBinaryAvailable, true);
  ASSERT_TRUE(extension);
  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id,
      "executableAvailableChangeIsReflected(true)"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;
}

IN_PROC_BROWSER_TEST_F(IpfsExtensionApiTest, ResolveMethodChangeIsReflected) {
  ResultCatcher catcher;
  const Extension* extension =
      LoadExtension(extension_dir_.AppendASCII("ipfsCompanion"));
  GetPrefs()->SetInteger(
      kIPFSResolveMethod,
      static_cast<int>(ipfs::IPFSResolveMethodTypes::IPFS_LOCAL));
  ASSERT_TRUE(extension);
  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id,
      "resolveMethodChangeIsReflected('local')"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;

  GetPrefs()->SetInteger(
      kIPFSResolveMethod,
      static_cast<int>(ipfs::IPFSResolveMethodTypes::IPFS_DISABLED));
  ASSERT_TRUE(extension);
  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id,
      "resolveMethodChangeIsReflected('disabled')"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;

  GetPrefs()->SetInteger(
      kIPFSResolveMethod,
      static_cast<int>(ipfs::IPFSResolveMethodTypes::IPFS_GATEWAY));
  ASSERT_TRUE(extension);
  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id,
      "resolveMethodChangeIsReflected('gateway')"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;
}

IN_PROC_BROWSER_TEST_F(IpfsExtensionApiTest, GetConfig) {
  ResultCatcher catcher;
  const Extension* extension =
      LoadExtension(extension_dir_.AppendASCII("ipfsCompanion"));
  ASSERT_TRUE(extension);

  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id,
      "getConfig(false, '')"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;

  WriteConfigToFile();
  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id,
      std::string("getConfig(true, '") + ipfs_config + "')"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;
}

// No great way to test launch and shutdown succeeding easily
// so at least just make sure the API call works.
IN_PROC_BROWSER_TEST_F(IpfsExtensionApiTest, LaunchShutdownFail) {
  ResultCatcher catcher;
  const Extension* extension =
      LoadExtension(extension_dir_.AppendASCII("ipfsCompanion"));
  ASSERT_TRUE(extension);

  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id, "launchFail()"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;

  ASSERT_TRUE(browsertest_util::ExecuteScriptInBackgroundPageNoWait(
      browser()->profile(), ipfs_companion_extension_id, "shutdownFail()"));
  ASSERT_TRUE(catcher.GetNextResult()) << message_;
}

IN_PROC_BROWSER_TEST_F(IpfsExtensionApiTest, IpfsAPINotAvailable) {
  ResultCatcher catcher;
  const Extension* extension =
      LoadExtension(extension_dir_.AppendASCII("notIpfsCompanion"));
  ASSERT_TRUE(extension);
  ASSERT_TRUE(catcher.GetNextResult()) << message_;
}

}  // namespace
}  // namespace extensions