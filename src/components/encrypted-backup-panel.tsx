import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Action, Heading, Muted, Panel } from './ui';
import { usePalette } from '../theme/colors';
import {
  createBackupSnapshot,
  getCurrentSchemaForReadOnlyPreview,
} from '../data/backup-repository';
import { createEncryptedBackup, verifyEncryptedBackup } from '../services/encrypted-backup';
import {
  pickEncryptedFile,
  shareEncryptedFile,
  writeEncryptedFileToCache,
} from '../services/encrypted-backup-files';
import type { BackupPreview } from '../domain/backup-archive';

/**
 * No auto-share, key logging or restore writes. The key is never in the file.
 * This is an opt-in encrypted export and authenticated, read-only import preview.
 */
export function EncryptedBackupPanel() {
  const { t } = useTranslation();
  const c = usePalette();
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [selectedEncrypted, setSelectedEncrypted] = useState<string | null>(null);
  const [enteredKey, setEnteredKey] = useState('');
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setRecoveryKey(null);
    setFileUri(null);
    setKeySaved(false);
    try {
      const { snapshot } = await createBackupSnapshot();
      const encrypted = await createEncryptedBackup(snapshot);
      const uri = writeEncryptedFileToCache(encrypted.ciphertextFileContents);
      setFileUri(uri);
      setRecoveryKey(encrypted.recoveryKey);
    } catch (reason) {
      Alert.alert(t('backupError'), reason instanceof Error ? reason.message : '');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!fileUri || !keySaved || busy) return;
    setBusy(true);
    try {
      await shareEncryptedFile(fileUri);
    } catch (reason) {
      Alert.alert(t('backupShareError'), reason instanceof Error ? reason.message : '');
    } finally {
      setBusy(false);
    }
  }

  async function selectFile() {
    setBusy(true);
    setPreview(null);
    setSelectedEncrypted(null);
    try {
      const encrypted = await pickEncryptedFile();
      if (encrypted !== null) setSelectedEncrypted(encrypted);
    } catch (reason) {
      Alert.alert(t('backupInvalidFile'), reason instanceof Error ? reason.message : '');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!selectedEncrypted || !enteredKey.trim() || busy) return;
    setBusy(true);
    setPreview(null);
    try {
      const localSchema = await getCurrentSchemaForReadOnlyPreview();
      const result = await verifyEncryptedBackup(selectedEncrypted, enteredKey, localSchema);
      setPreview(result);
      // The typed key should not remain displayed after validation.
      setEnteredKey('');
    } catch (reason) {
      Alert.alert(t('backupVerifyError'), reason instanceof Error ? reason.message : '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel>
        <Heading>{t('backupTitle')}</Heading>
        <Muted>{t('backupDescription')}</Muted>
        <Action label={t('backupCreate')} onPress={() => void generate()} disabled={busy} />
        {recoveryKey !== null && fileUri !== null ? (
          <View style={{ gap: 10 }}>
            <Muted>{t('backupRecoveryWarning')}</Muted>
            <Text
              selectable
              accessibilityLabel={t('backupRecoveryKey')}
              style={{ color: c.text, fontSize: 16, fontWeight: '700' }}
            >
              {recoveryKey}
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: keySaved }}
              disabled={busy}
              onPress={() => setKeySaved((x) => !x)}
              style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12 }}
            >
              <Text style={{ color: c.text }}>
                {keySaved ? '[x] ' : '[ ] '}
                {t('backupKeySaved')}
              </Text>
            </Pressable>
            <Action
              label={t('backupShare')}
              onPress={() => void share()}
              disabled={busy || !keySaved}
            />
            <Action
              label={t('backupHideKey')}
              disabled={busy}
              onPress={() => {
                setRecoveryKey(null);
                setFileUri(null);
                setKeySaved(false);
              }}
            />
          </View>
        ) : null}
      </Panel>
      <Panel>
        <Heading>{t('backupVerifyTitle')}</Heading>
        <Muted>{t('backupPreviewOnlyWarning')}</Muted>
        <Action
          label={t('backupSelectFile')}
          disabled={busy}
          onPress={() => void selectFile()}
        />
        {selectedEncrypted ? (
          <>
            <Muted>{t('backupSelected')}</Muted>
            <TextInput
              accessibilityLabel={t('backupEnterKey')}
              value={enteredKey}
              onChangeText={setEnteredKey}
              placeholder={t('backupEnterKey')}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={95}
              placeholderTextColor={c.muted}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
                color: c.text,
                padding: 12,
              }}
            />
            <Action
              label={t('backupVerify')}
              onPress={() => void verify()}
              disabled={busy || !enteredKey.trim()}
            />
          </>
        ) : null}
        {preview ? (
          <View style={{ gap: 6 }}>
            <Heading>{t('backupVerified')}</Heading>
            <Muted>{t('backupPreviewCreated', { date: preview.createdAt })}</Muted>
            <Muted>
              {t('backupPreviewRows', {
                count: preview.totalRows,
                tables: preview.tableCounts.length,
              })}
            </Muted>
            {preview.tableCounts.map((item) => (
              <Text key={item.table} style={{ color: c.text }}>
                {item.table}: {item.count}
              </Text>
            ))}
            <Muted>{t('backupNoRestore')}</Muted>
          </View>
        ) : null}
      </Panel>
    </>
  );
}
