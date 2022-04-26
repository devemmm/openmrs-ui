import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import styles from '../../input.scss';
import { useTranslation } from 'react-i18next';
import { Input } from '../../basic-input/input/input.component';
import { IdentifierSourceAutoGenerationOption, PatientIdentifierValue } from '../../../patient-registration-types';
import { PatientRegistrationContext } from '../../../patient-registration-context';
import { TrashCan16, Edit16 } from '@carbon/icons-react';
import { Button } from 'carbon-components-react';
import { ResourcesContext } from '../../../../offline.resources';
import { showModal, useConfig } from '@openmrs/esm-framework';
import { shouldBlockPatientIdentifierInOfflineMode } from './utils';
import { useField } from 'formik';

interface IdentifierInputProps {
  patientIdentifier: PatientIdentifierValue;
  index: number;
  remove: <T>(index: number) => T;
}

export const IdentifierInput: React.FC<IdentifierInputProps> = ({ patientIdentifier, index, remove }) => {
  const { identifierTypes } = useContext(ResourcesContext);
  const { isOffline } = useContext(PatientRegistrationContext);
  const identifierType = useMemo(
    () => identifierTypes.find((identifierType) => identifierType.uuid === patientIdentifier.identifierTypeUuid),
    [patientIdentifier, identifierTypes],
  );
  const fieldName = `identifiers[${index}].identifier`;
  const [identifierField, identifierFieldMeta] = useField(fieldName);
  const { setFieldValue } = React.useContext(PatientRegistrationContext);
  const { source, action, identifier } = patientIdentifier;
  const identifierName = identifierType?.name;
  const { t } = useTranslation();
  const [option, setAutoGenerationOption] = useState<Partial<IdentifierSourceAutoGenerationOption>>({
    manualEntryEnabled: source ? true : undefined,
    automaticGenerationEnabled: undefined,
  });
  const autoGenerated = !option.manualEntryEnabled || (option.manualEntryEnabled && option.automaticGenerationEnabled);
  const disabled = isOffline && shouldBlockPatientIdentifierInOfflineMode(identifierType);
  const { defaultPatientIdentifierTypes } = useConfig();
  const defaultPatientIdentifierTypesMap = useMemo(() => {
    const map = {};
    defaultPatientIdentifierTypes?.forEach((typeUuid) => {
      map[typeUuid] = true;
    });
    return map;
  }, [defaultPatientIdentifierTypes]);
  const isNewIdentifier = patientIdentifier?.action === 'ADD' || patientIdentifier?.action === undefined;

  useEffect(() => {
    if (source?.autoGenerationOption?.automaticGenerationEnabled) {
      setFieldValue(`identifiers[${index}].autoGeneration`, true);
      setFieldValue(`identifiers[${index}].identifier`, 'auto-generated');
    }
  }, [source]);

  useEffect(() => {
    if (source) {
      if (source.autoGenerationOption) {
        setAutoGenerationOption(source.autoGenerationOption);

        if (source.autoGenerationOption.automaticGenerationEnabled) {
          setFieldValue(`identifiers[${index}].autoGeneration`, true);
          setFieldValue(`identifiers[${index}].identifier`, 'auto-generated');
        }
      } else {
        setAutoGenerationOption({
          manualEntryEnabled: true,
          automaticGenerationEnabled: false,
        });
        setFieldValue(`identifiers[${index}].autoGeneration`, false);
      }
    } else {
      setAutoGenerationOption({
        manualEntryEnabled: true,
        automaticGenerationEnabled: false,
      });
      setFieldValue(`identifiers[${index}].autoGeneration`, false);
    }
  }, [source]);

  const handleEdit = useCallback(() => {
    setFieldValue(`identifiers[${index}]`, {
      ...patientIdentifier,
      action: 'UPDATE',
      source: identifierType?.identifierSources?.[0],
    } as PatientIdentifierValue);
  }, [patientIdentifier]);

  const handleDelete = useCallback(() => {
    if (action === 'ADD') {
      remove(index);
    } else {
      const confirmDeleteIdentifierModal = showModal('delete-identifier-confirmation-modal', {
        deleteIdentifier: (deleteIdentifier) => {
          if (deleteIdentifier) {
            setFieldValue(`identifiers[${index}].action`, 'DELETE');
          }
          confirmDeleteIdentifierModal();
        },
        identifierName,
        identifierValue: identifier,
      });
    }
  }, [action, patientIdentifier, identifierName, identifier]);

  return (
    <div className={styles.IDInput}>
      {option.manualEntryEnabled && (action === 'ADD' || action === 'UPDATE') ? (
        <Input
          id={identifierName}
          light
          labelText={identifierName}
          name={fieldName}
          disabled={!option.manualEntryEnabled || disabled}
          invalid={!!(identifierFieldMeta.touched && identifierFieldMeta.error)}
          invalidText={identifierFieldMeta.error && t(identifierFieldMeta.error)}
          {...identifierField}
        />
      ) : (
        <div className={styles.textID}>
          <p className={styles.label}>{identifierName}</p>
          <p className={styles.bodyShort02}>
            {!isNewIdentifier ? identifier : t('autoGeneratedPlaceholderText', 'Auto generated')}
          </p>
        </div>
      )}
      <div>
        {!(
          identifierType.isPrimary ||
          identifierType.required ||
          defaultPatientIdentifierTypesMap[identifierType.uuid]
        ) &&
          patientIdentifier.action === 'NONE' && (
            <Button
              kind="ghost"
              onClick={handleEdit}
              iconDescription={t('editIdentifierTooltip', 'Edit')}
              disabled={disabled}
              hasIconOnly>
              <Edit16 />
            </Button>
          )}
        {!(
          identifierType?.isPrimary ||
          identifierType?.required ||
          defaultPatientIdentifierTypesMap[identifierType.uuid]
        ) && (
          <Button
            kind="danger--ghost"
            onClick={handleDelete}
            iconDescription={t('deleteIdentifierTooltip', 'Delete')}
            disabled={disabled}
            hasIconOnly>
            <TrashCan16 />
          </Button>
        )}
      </div>
    </div>
  );
};
