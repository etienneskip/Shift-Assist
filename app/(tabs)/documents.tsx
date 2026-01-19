
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedDelete, BACKEND_URL } from '@/utils/api';
import { router } from 'expo-router';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  expiry_date: string | null;
  status: 'active' | 'expired' | 'expiring_soon';
  created_at: string;
}

export default function DocumentsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadDocuments();
      } else {
        router.replace('/auth');
      }
    }
  }, [user, authLoading]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      console.log('[Documents] Loading documents from:', BACKEND_URL);
      
      if (!user) {
        console.log('[Documents] No user found, skipping load');
        return;
      }

      // GET /api/compliance-documents/my - Get my compliance documents
      const documentsResponse = await authenticatedGet<any[]>('/api/compliance-documents/my');
      console.log('[Documents] Documents response:', documentsResponse);
      
      // Transform the response to match the expected interface
      const transformedDocuments: Document[] = (documentsResponse || []).map((doc: any) => ({
        id: doc.id,
        document_type: doc.documentType || doc.document_type || 'other',
        file_name: doc.fileName || doc.documentName || 'Unknown',
        file_url: doc.url || doc.fileUrl || '',
        expiry_date: doc.expiryDate || doc.expiry_date || null,
        status: doc.status || 'active',
        created_at: doc.createdAt || doc.uploadedAt || new Date().toISOString(),
      }));
      
      setDocuments(transformedDocuments);
    } catch (error) {
      console.error('[Documents] Error loading documents:', error);
      Alert.alert('Error', 'Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('[Documents] Uploading document:', result.assets[0].uri);
        
        // Create FormData for file upload
        const formData = new FormData();
        const uri = result.assets[0].uri;
        const filename = uri.split('/').pop() || 'document';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('file', {
          uri,
          name: filename,
          type,
        } as any);

        // POST /api/compliance-documents/upload - Upload a compliance document
        const token = await import('@/utils/api').then(m => m.getBearerToken());
        const response = await fetch(`${BACKEND_URL}/api/compliance-documents/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Documents] Upload error:', response.status, errorText);
          throw new Error(`Upload failed: ${response.status}`);
        }

        const uploadResult = await response.json();
        console.log('[Documents] Upload result:', uploadResult);
        
        Alert.alert('Success', 'Document uploaded successfully!');
        loadDocuments();
      }
    } catch (error) {
      console.error('[Documents] Error uploading document:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Documents] Deleting document:', documentId);
              // DELETE /api/compliance-documents/:documentId - Delete a compliance document
              await authenticatedDelete(`/api/compliance-documents/${documentId}`);
              Alert.alert('Success', 'Document deleted successfully!');
              loadDocuments();
            } catch (error) {
              console.error('[Documents] Error deleting document:', error);
              Alert.alert('Error', 'Failed to delete document.');
            }
          },
        },
      ]
    );
  };

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return 'No expiry';
    const date = new Date(dateString);
    return `Expires on ${date.toLocaleDateString('en-US', { 
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })}`;
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      drivers_license: 'Drivers License',
      car_insurance: 'Comprehensive Car Insurance',
      wwcc: 'Working With Children Check',
      first_aid: 'First Aid Certificate',
      cpr: 'CPR Certificate',
      qualification: 'Qualification',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const renderDocumentCard = (doc: Document) => (
    <TouchableOpacity
      key={doc.id}
      style={styles.documentCard}
      activeOpacity={0.7}
    >
      <View style={styles.documentHeader}>
        <Text style={styles.documentName}>{doc.file_name}</Text>
        <TouchableOpacity
          onPress={() => handleDeleteDocument(doc.id)}
          style={styles.deleteButton}
        >
          <IconSymbol 
            ios_icon_name="trash" 
            android_material_icon_name="delete" 
            size={20} 
            color={colors.danger} 
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.documentTypeContainer}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {getDocumentTypeLabel(doc.document_type)}
          </Text>
        </View>
      </View>

      <Text style={styles.expiryText}>{formatExpiryDate(doc.expiry_date)}</Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <IconSymbol 
        ios_icon_name="doc.text" 
        android_material_icon_name="description" 
        size={64} 
        color={colors.textSecondary} 
      />
      <Text style={styles.emptyStateTitle}>No Documents Yet</Text>
      <Text style={styles.emptyStateText}>
        Upload your compliance documents, certifications, and qualifications to get started.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Document</Text>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Document type</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Text style={styles.filterButtonText}>{selectedFilter}</Text>
          <IconSymbol 
            ios_icon_name="chevron.down" 
            android_material_icon_name="arrow-drop-down" 
            size={20} 
            color={colors.text} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading documents...</Text>
          </View>
        ) : documents.length === 0 ? (
          renderEmptyState()
        ) : (
          documents.map(renderDocumentCard)
        )}
      </ScrollView>

      <TouchableOpacity style={styles.addButton} onPress={handleAddDocument}>
        <Text style={styles.addButtonText}>Add New Document</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E3A5F',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonText: {
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5B8DBE',
    flex: 1,
    textDecorationLine: 'underline',
  },
  deleteButton: {
    padding: 4,
  },
  documentTypeContainer: {
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  expiryText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: colors.border,
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
