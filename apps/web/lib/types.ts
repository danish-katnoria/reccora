export type Role = 'SHOPPER' | 'CREATOR' | 'ADMIN';

export interface Paginated<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasMore: boolean };
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  avatarUrl: string | null;
  emailVerified: boolean;
  isProfilePrivate?: boolean;
  showActivity?: boolean;
  creatorProfile: { id: string; handle: string; status: 'PENDING' | 'APPROVED' | 'SUSPENDED' } | null;
}

export interface Category { id: string; name: string; slug: string; parentId: string | null }

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  merchantName: string;
  brand: { id: string; name: string; slug: string; logoUrl: string | null } | null;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null }[];
  imageUrl: string | null;
  purchasable: boolean;
  saveCount: number;
  isSaved?: boolean;
}

export interface CreatorSummary {
  id: string;
  handle: string;
  displayName: string;
  bio?: string | null;
  avatarUrl: string | null;
  coverUrl?: string | null;
  followerCount?: number;
  storefrontUrl?: string;
  isFollowing?: boolean;
  status?: 'PENDING' | 'APPROVED' | 'SUSPENDED';
}

export interface FeedPost {
  id: string;
  caption: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO';
  thumbnailUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'REMOVED';
  publishedAt: string | null;
  creator: CreatorSummary;
  products: Product[];
}

export interface CollectionSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  productCount: number;
  saveCount: number;
  isPublic?: boolean;
  isSaved?: boolean;
  creator: { handle: string; displayName: string; avatarUrl?: string | null };
}

export interface CollectionDetail extends CollectionSummary { products: Product[] }

export interface Storefront {
  creator: CreatorSummary;
  products: Product[];
  posts: { id: string; caption: string; mediaUrl: string; mediaType: 'IMAGE' | 'VIDEO'; thumbnailUrl: string | null; publishedAt: string }[];
  collections: { id: string; title: string; slug: string; description: string | null; coverUrl: string | null; productCount: number; saveCount: number }[];
}

export interface ProductDetail extends Product {
  recommendedBy: { creator: CreatorSummary; postId: string; caption: string; mediaUrl?: string; thumbnailUrl?: string | null }[];
  similar: Product[];
}

export interface SearchResults { products: Product[]; creators: CreatorSummary[]; collections: CollectionSummary[] }
