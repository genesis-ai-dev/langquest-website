export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      asset: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          images: string | null;
          last_updated: string;
          name: string;
          source_language_id: string | null;
          creator_id: string | null;
          visible: boolean;
          project_id: string;
          source_asset_id: string | null;
          order_index: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          images?: string | null;
          last_updated?: string;
          name: string;
          source_language_id?: string | null;
          creator_id?: string | null;
          visible?: boolean;
          project_id: string;
          source_asset_id?: string | null;
          order_index?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          images?: string | null;
          last_updated?: string;
          name?: string;
          source_language_id?: string | null;
          creator_id?: string | null;
          visible?: boolean;
          project_id?: string;
          source_asset_id?: string | null;
          order_index?: number;
        };
        Relationships: [];
      };
      asset_content_link: {
        Row: {
          active: boolean;
          asset_id: string;
          audio: string | null;
          created_at: string;
          id: string;
          last_updated: string;
          order_index: number;
          text: string;
          source_language_id: string | null;
          languoid_id: string | null;
        };
        Insert: {
          active?: boolean;
          asset_id: string;
          audio?: string | null;
          created_at?: string;
          id?: string;
          last_updated?: string;
          order_index?: number;
          text: string;
          source_language_id?: string | null;
          languoid_id?: string | null;
        };
        Update: {
          active?: boolean;
          asset_id?: string;
          audio?: string | null;
          created_at?: string;
          id?: string;
          last_updated?: string;
          order_index?: number;
          text?: string;
          source_language_id?: string | null;
          languoid_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_content_link_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'asset';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_content_link_languoid_id_fkey';
            columns: ['languoid_id'];
            isOneToOne: false;
            referencedRelation: 'languoid';
            referencedColumns: ['id'];
          }
        ];
      };
      asset_download: {
        Row: {
          active: boolean;
          asset_id: string;
          created_at: string;
          last_updated: string;
          profile_id: string;
        };
        Insert: {
          active?: boolean;
          asset_id: string;
          created_at?: string;
          last_updated?: string;
          profile_id: string;
        };
        Update: {
          active?: boolean;
          asset_id?: string;
          created_at?: string;
          last_updated?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_download_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'asset';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_download_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          }
        ];
      };
      asset_tag_link: {
        Row: {
          active: boolean;
          asset_id: string;
          created_at: string;
          last_modified: string;
          tag_id: string;
        };
        Insert: {
          active?: boolean;
          asset_id: string;
          created_at?: string;
          last_modified?: string;
          tag_id: string;
        };
        Update: {
          active?: boolean;
          asset_id?: string;
          created_at?: string;
          last_modified?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'asset_tags_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'asset';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'asset_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tag';
            referencedColumns: ['id'];
          }
        ];
      };
      language: {
        Row: {
          active: boolean;
          created_at: string;
          creator_id: string | null;
          english_name: string;
          id: string;
          iso639_3: string;
          last_updated: string;
          native_name: string;
          ui_ready: boolean;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          creator_id?: string | null;
          english_name: string;
          id?: string;
          iso639_3: string;
          last_updated?: string;
          native_name: string;
          ui_ready?: boolean;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          creator_id?: string | null;
          english_name?: string;
          id?: string;
          iso639_3?: string;
          last_updated?: string;
          native_name?: string;
          ui_ready?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'languages_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          }
        ];
      };
      languoid: {
        Row: {
          id: string;
          active: boolean;
          created_at: string;
          last_updated: string;
          name: string | null;
          parent_id: string | null;
          level: 'family' | 'language' | 'dialect';
          ui_ready: boolean;
          creator_id: string | null;
        };
        Insert: {
          id?: string;
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          name?: string | null;
          parent_id?: string | null;
          level: 'family' | 'language' | 'dialect';
          ui_ready?: boolean;
          creator_id?: string | null;
        };
        Update: {
          id?: string;
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          name?: string | null;
          parent_id?: string | null;
          level?: 'family' | 'language' | 'dialect';
          ui_ready?: boolean;
          creator_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'languoid_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'languoid';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'languoid_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          }
        ];
      };
      languoid_alias: {
        Row: {
          id: string;
          active: boolean;
          created_at: string;
          last_updated: string;
          subject_languoid_id: string;
          label_languoid_id: string | null;
          name: string;
          alias_type: string | null;
          creator_id: string | null;
        };
        Insert: {
          id?: string;
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          subject_languoid_id: string;
          label_languoid_id?: string | null;
          name: string;
          alias_type?: string | null;
          creator_id?: string | null;
        };
        Update: {
          id?: string;
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          subject_languoid_id?: string;
          label_languoid_id?: string | null;
          name?: string;
          alias_type?: string | null;
          creator_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'languoid_alias_subject_languoid_id_fkey';
            columns: ['subject_languoid_id'];
            isOneToOne: false;
            referencedRelation: 'languoid';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'languoid_alias_label_languoid_id_fkey';
            columns: ['label_languoid_id'];
            isOneToOne: false;
            referencedRelation: 'languoid';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'languoid_alias_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          }
        ];
      };
      languoid_source: {
        Row: {
          id: string;
          active: boolean;
          created_at: string;
          last_updated: string;
          languoid_id: string;
          name: string;
          unique_identifier: string;
          creator_id: string | null;
        };
        Insert: {
          id?: string;
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          languoid_id: string;
          name: string;
          unique_identifier: string;
          creator_id?: string | null;
        };
        Update: {
          id?: string;
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          languoid_id?: string;
          name?: string;
          unique_identifier?: string;
          creator_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'languoid_source_languoid_id_fkey';
            columns: ['languoid_id'];
            isOneToOne: false;
            referencedRelation: 'languoid';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'languoid_source_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          }
        ];
      };
      languoid_property: {
        Row: {
          id: string;
          active: boolean;
          created_at: string;
          last_updated: string;
          languoid_id: string;
          name: string;
          value: string;
          value_type: string | null;
          creator_id: string | null;
        };
        Insert: {
          id?: string;
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          languoid_id: string;
          name: string;
          value: string;
          value_type?: string | null;
          creator_id?: string | null;
        };
        Update: {
          id?: string;
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          languoid_id?: string;
          name?: string;
          value?: string;
          value_type?: string | null;
          creator_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'languoid_property_languoid_id_fkey';
            columns: ['languoid_id'];
            isOneToOne: false;
            referencedRelation: 'languoid';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'languoid_property_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          }
        ];
      };
      profile: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          last_updated: string;
          password: string | null;
          ui_language_id: string | null;
          ui_languoid_id: string | null;
          username: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id: string;
          last_updated?: string;
          password?: string | null;
          ui_language_id?: string | null;
          ui_languoid_id?: string | null;
          username?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          last_updated?: string;
          password?: string | null;
          ui_language_id?: string | null;
          ui_languoid_id?: string | null;
          username?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_ui_languoid_id_fkey';
            columns: ['ui_languoid_id'];
            isOneToOne: false;
            referencedRelation: 'languoid';
            referencedColumns: ['id'];
          }
        ];
      };
      profile_project_link: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          last_updated: string;
          membership: string;
          profile_id: string;
          project_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          last_updated?: string;
          membership: string;
          profile_id: string;
          project_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          last_updated?: string;
          membership?: string;
          profile_id?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profile_project_link_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'profile_project_link_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'project';
            referencedColumns: ['id'];
          }
        ];
      };
      project: {
        Row: {
          active: boolean | null;
          created_at: string;
          description: string | null;
          id: string;
          last_updated: string;
          name: string;
          target_language_id: string | null;
          creator_id: string | null;
          visible: boolean;
          template: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          last_updated?: string;
          name: string;
          target_language_id?: string | null;
          creator_id?: string | null;
          visible?: boolean;
          template?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          last_updated?: string;
          name?: string;
          target_language_id?: string | null;
          creator_id?: string | null;
          visible?: boolean;
          template?: string | null;
        };
        Relationships: [];
      };
      project_language_link: {
        Row: {
          project_id: string;
          language_id: string | null;
          languoid_id: string;
          language_type: 'source' | 'target';
          active: boolean;
          created_at: string;
          last_updated: string;
          download_profiles: string[] | null;
          ingest_batch_id: string | null;
        };
        Insert: {
          project_id: string;
          language_id?: string | null;
          languoid_id: string;
          language_type: 'source' | 'target';
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          download_profiles?: string[] | null;
          ingest_batch_id?: string | null;
        };
        Update: {
          project_id?: string;
          language_id?: string | null;
          languoid_id?: string;
          language_type?: 'source' | 'target';
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          download_profiles?: string[] | null;
          ingest_batch_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'project_language_link_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'project';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_language_link_languoid_id_fkey';
            columns: ['languoid_id'];
            isOneToOne: false;
            referencedRelation: 'languoid';
            referencedColumns: ['id'];
          }
        ];
      };
      project_download: {
        Row: {
          active: boolean;
          created_at: string;
          last_updated: string;
          profile_id: string;
          project_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          profile_id: string;
          project_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          profile_id?: string;
          project_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_download_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_download_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'project';
            referencedColumns: ['id'];
          }
        ];
      };
      quest: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          last_updated: string;
          name: string | null;
          project_id: string;
          creator_id: string | null;
          parent_id: string | null;
          metadata: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          last_updated?: string;
          name?: string | null;
          project_id: string;
          creator_id?: string | null;
          parent_id?: string | null;
          metadata?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          last_updated?: string;
          name?: string | null;
          project_id?: string;
          creator_id?: string | null;
          parent_id?: string | null;
          metadata?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quests_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'project';
            referencedColumns: ['id'];
          }
        ];
      };
      quest_asset_link: {
        Row: {
          active: boolean;
          asset_id: string;
          created_at: string;
          last_updated: string;
          quest_id: string;
        };
        Insert: {
          active?: boolean;
          asset_id: string;
          created_at?: string;
          last_updated?: string;
          quest_id: string;
        };
        Update: {
          active?: boolean;
          asset_id?: string;
          created_at?: string;
          last_updated?: string;
          quest_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quest_assets_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'asset';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quest_assets_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quest';
            referencedColumns: ['id'];
          }
        ];
      };
      quest_download: {
        Row: {
          active: boolean;
          created_at: string;
          last_updated: string;
          profile_id: string;
          quest_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          profile_id: string;
          quest_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          profile_id?: string;
          quest_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quest_download_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quest_download_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quest';
            referencedColumns: ['id'];
          }
        ];
      };
      quest_tag_link: {
        Row: {
          active: boolean;
          created_at: string;
          last_updated: string;
          quest_id: string;
          tag_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          quest_id: string;
          tag_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          last_updated?: string;
          quest_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'quest_tags_quest_id_fkey';
            columns: ['quest_id'];
            isOneToOne: false;
            referencedRelation: 'quest';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quest_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tag';
            referencedColumns: ['id'];
          }
        ];
      };
      tag: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          last_updated: string;
          key: string;
          value: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          last_updated?: string;
          key: string;
          value: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          last_updated?: string;
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
      translation: {
        Row: {
          active: boolean;
          asset_id: string;
          audio: string | null;
          created_at: string;
          creator_id: string | null;
          id: string;
          last_updated: string;
          target_language_id: string;
          text: string | null;
        };
        Insert: {
          active?: boolean;
          asset_id: string;
          audio?: string | null;
          created_at?: string;
          creator_id?: string | null;
          id?: string;
          last_updated?: string;
          target_language_id: string;
          text?: string | null;
        };
        Update: {
          active?: boolean;
          asset_id?: string;
          audio?: string | null;
          created_at?: string;
          creator_id?: string | null;
          id?: string;
          last_updated?: string;
          target_language_id?: string;
          text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'translations_asset_id_fkey';
            columns: ['asset_id'];
            isOneToOne: false;
            referencedRelation: 'asset';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'translations_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          }
        ];
      };
      vote: {
        Row: {
          active: boolean;
          comment: string | null;
          created_at: string;
          creator_id: string | null;
          id: string;
          last_updated: string;
          polarity: string;
          translation_id: string;
        };
        Insert: {
          active?: boolean;
          comment?: string | null;
          created_at?: string;
          creator_id?: string | null;
          id?: string;
          last_updated?: string;
          polarity: string;
          translation_id: string;
        };
        Update: {
          active?: boolean;
          comment?: string | null;
          created_at?: string;
          creator_id?: string | null;
          id?: string;
          last_updated?: string;
          polarity?: string;
          translation_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'votes_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'votes_translation_id_fkey';
            columns: ['translation_id'];
            isOneToOne: false;
            referencedRelation: 'translation';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_languoids: {
        Args: {
          search_query: string;
          result_limit?: number;
          ui_ready_only?: boolean;
        };
        Returns: {
          id: string;
          name: string | null;
          level: string | null;
          ui_ready: boolean | null;
          parent_id: string | null;
          matched_alias_name: string | null;
          matched_alias_type: string | null;
          iso_code: string | null;
          search_rank: number;
        }[];
      };
      find_matching_languoid: {
        Args: {
          p_iso639_3?: string;
          p_english_name?: string;
          p_native_name?: string;
        };
        Returns: string | null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema['CompositeTypes']
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema['CompositeTypes']
    ? PublicSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

// Convenience type exports for languoid tables
export type Languoid = Tables<'languoid'>;
export type LanguoidAlias = Tables<'languoid_alias'>;
export type LanguoidSource = Tables<'languoid_source'>;
export type LanguoidProperty = Tables<'languoid_property'>;
export type ProjectLanguageLink = Tables<'project_language_link'>;

// Search result type from the RPC function
export interface LanguoidSearchResult {
  id: string;
  name: string | null;
  level: string | null;
  ui_ready: boolean | null;
  parent_id: string | null;
  matched_alias_name: string | null;
  matched_alias_type: string | null;
  iso_code: string | null;
  search_rank: number;
}
