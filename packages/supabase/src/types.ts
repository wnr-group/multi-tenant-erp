Connecting to db 5432
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          status: 'draft' | 'active' | 'archived'
          name: string
          school_id: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          status?: 'draft' | 'active' | 'archived'
          name: string
          school_id: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          status?: 'draft' | 'active' | 'archived'
          name?: string
          school_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string
          created_by: string
          id: string
          school_id: string
          target_id: string | null
          target_type: Database["public"]["Enums"]["announcement_target_type"]
          title: string
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string
          created_by: string
          id?: string
          school_id: string
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["announcement_target_type"]
          title: string
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          school_id?: string
          target_id?: string | null
          target_type?: Database["public"]["Enums"]["announcement_target_type"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string
          school_id: string
          section_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          marked_by: string
          school_id: string
          section_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string
          school_id?: string
          section_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          acting_as_role: Database["public"]["Enums"]["app_role"]
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          performed_by: string
          school_id: string | null
        }
        Insert: {
          acting_as_role: Database["public"]["Enums"]["app_role"]
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          performed_by: string
          school_id?: string | null
        }
        Update: {
          acting_as_role?: Database["public"]["Enums"]["app_role"]
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          performed_by?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          name: string
          order: number
          school_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order?: number
          school_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order?: number
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_records: {
        Row: {
          category: Database["public"]["Enums"]["discipline_category"]
          created_at: string
          description: string
          id: string
          parent_notified: boolean
          recorded_by: string
          school_id: string
          severity: Database["public"]["Enums"]["discipline_severity"]
          student_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["discipline_category"]
          created_at?: string
          description: string
          id?: string
          parent_notified?: boolean
          recorded_by: string
          school_id: string
          severity: Database["public"]["Enums"]["discipline_severity"]
          student_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["discipline_category"]
          created_at?: string
          description?: string
          id?: string
          parent_notified?: boolean
          recorded_by?: string
          school_id?: string
          severity?: Database["public"]["Enums"]["discipline_severity"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipline_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discipline_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          created_at: string
          exam_id: string
          grade: string | null
          id: string
          marks_obtained: number | null
          max_marks: number
          school_id: string
          student_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          max_marks?: number
          school_id: string
          student_id: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          max_marks?: number
          school_id?: string
          student_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year_id: string
          created_at: string
          end_date: string | null
          id: string
          name: string
          school_id: string
          start_date: string | null
        }
        Insert: {
          academic_year_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          school_id: string
          start_date?: string | null
        }
        Update: {
          academic_year_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          school_id?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string
          fee_structure_id: string
          id: string
          payment_date: string | null
          payment_method: string | null
          receipt_number: string | null
          school_id: string
          status: Database["public"]["Enums"]["fee_payment_status"]
          student_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          fee_structure_id: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["fee_payment_status"]
          student_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          fee_structure_id?: string
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          receipt_number?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["fee_payment_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year_id: string
          amount: number
          class_id: string
          created_at: string
          due_date: string | null
          fee_type: string
          id: string
          school_id: string
        }
        Insert: {
          academic_year_id: string
          amount: number
          class_id: string
          created_at?: string
          due_date?: string | null
          fee_type: string
          id?: string
          school_id: string
        }
        Update: {
          academic_year_id?: string
          amount?: number
          class_id?: string
          created_at?: string
          due_date?: string | null
          fee_type?: string
          id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string
          response: string | null
          school_id: string
          status: Database["public"]["Enums"]["feedback_status"]
          subject: string
          to_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message: string
          response?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["feedback_status"]
          subject: string
          to_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          response?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          subject?: string
          to_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "feedback_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          attachment_url: string | null
          class_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          school_id: string
          section_id: string
          subject_id: string
          teacher_id: string
          title: string
        }
        Insert: {
          attachment_url?: string | null
          class_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          school_id: string
          section_id: string
          subject_id: string
          teacher_id: string
          title: string
        }
        Update: {
          attachment_url?: string | null
          class_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          school_id?: string
          section_id?: string
          subject_id?: string
          teacher_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          school_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          school_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          school_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          school_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          phone?: string | null
          school_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      report_card_templates: {
        Row: {
          created_at: string
          html_template: string
          id: string
          is_default: boolean
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string
          html_template?: string
          id?: string
          is_default?: boolean
          name: string
          school_id: string
        }
        Update: {
          created_at?: string
          html_template?: string
          id?: string
          is_default?: boolean
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_card_templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          domain: string | null
          features_enabled: Json
          id: string
          is_active: boolean
          logo_url: string | null
          max_students: number
          name: string
          primary_color: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          domain?: string | null
          features_enabled?: Json
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_students?: number
          name: string
          primary_color?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          domain?: string | null
          features_enabled?: Json
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_students?: number
          name?: string
          primary_color?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          id: string
          is_active: boolean
          roll_number: string | null
          school_id: string
          section_id: string
          student_profile_id: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          roll_number?: string | null
          school_id: string
          section_id: string
          student_profile_id: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          roll_number?: string | null
          school_id?: string
          section_id?: string
          student_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_profile_id_fkey"
            columns: ["student_profile_id"]
            isOneToOne: false
            referencedRelation: "student_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          admission_number: string | null
          created_at: string
          id: string
          parent_profile_id: string | null
          profile_id: string
          school_id: string
        }
        Insert: {
          admission_number?: string | null
          created_at?: string
          id?: string
          parent_profile_id?: string | null
          profile_id: string
          school_id: string
        }
        Update: {
          admission_number?: string | null
          created_at?: string
          id?: string
          parent_profile_id?: string | null
          profile_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_parent_profile_id_fkey"
            columns: ["parent_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string
          code: string | null
          created_at: string
          id: string
          name: string
          school_id: string
        }
        Insert: {
          class_id: string
          code?: string | null
          created_at?: string
          id?: string
          name: string
          school_id: string
        }
        Update: {
          class_id?: string
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          file_url: string
          id: string
          school_id: string
          subject_id: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          file_url: string
          id?: string
          school_id: string
          subject_id: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          file_url?: string
          id?: string
          school_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "syllabus_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_profiles: {
        Row: {
          class_teacher_of: string | null
          created_at: string
          id: string
          profile_id: string
          school_id: string
          subjects: string[]
        }
        Insert: {
          class_teacher_of?: string | null
          created_at?: string
          id?: string
          profile_id: string
          school_id: string
          subjects?: string[]
        }
        Update: {
          class_teacher_of?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          school_id?: string
          subjects?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "teacher_profiles_class_teacher_of_fkey"
            columns: ["class_teacher_of"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          period: number
          school_id: string
          section_id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          period: number
          school_id: string
          section_id: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          period?: number
          school_id?: string
          section_id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_my_school_id: { Args: never; Returns: string }
    }
    Enums: {
      announcement_target_type: "school" | "class" | "section"
      app_role:
        | "super_admin"
        | "school_admin"
        | "principal"
        | "teacher"
        | "student"
        | "parent"
      attendance_status: "present" | "absent" | "late" | "half_day"
      discipline_category: "behavioral" | "academic" | "attendance"
      discipline_severity: "verbal" | "written" | "suspension"
      fee_payment_status: "pending" | "paid" | "partial" | "overdue"
      feedback_status: "open" | "responded" | "closed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      announcement_target_type: ["school", "class", "section"],
      app_role: [
        "super_admin",
        "school_admin",
        "principal",
        "teacher",
        "student",
        "parent",
      ],
      attendance_status: ["present", "absent", "late", "half_day"],
      discipline_category: ["behavioral", "academic", "attendance"],
      discipline_severity: ["verbal", "written", "suspension"],
      fee_payment_status: ["pending", "paid", "partial", "overdue"],
      feedback_status: ["open", "responded", "closed"],
    },
  },
} as const

A new version of Supabase CLI is available: v2.90.0 (currently installed v2.75.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
