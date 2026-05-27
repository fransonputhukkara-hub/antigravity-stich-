import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isMockMode } from '../services/supabase';
import type { Profile, Tenant, Settings, Shop } from '../types/database';

interface AuthContextType {
  user: any | null;
  profile: Profile | null;
  tenant: Tenant | null;
  settings: Settings | null;
  shops: Shop[];
  currentShop: Shop | null;
  setCurrentShop: (shop: Shop) => void;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  onboardTenant: (
    businessName: string,
    planType: 'single_shop' | 'multi_branch',
    firstBranchName: string,
    address: string,
    phone: string
  ) => Promise<{ error: any }>;
  refreshAuthData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShop, setCurrentShopState] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentShop = (shop: Shop) => {
    setCurrentShopState(shop);
  };

  const loadAuthMetadata = async (currentUser: any) => {
    console.log('[StitchBill Auth] loadAuthMetadata started for:', currentUser.email);
    
    // Safety timer to prevent freezing during cold starts
    const metadataTimeout = setTimeout(() => {
      console.warn('[StitchBill Auth] Database query safety timeout reached (90s).');
      setIsLoading(false);
    }, 90000);

    try {
      // 1. Fetch Profile
      console.log('[StitchBill Auth] 1. Fetching profile...');
      let { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      // Client-side auto creation if database trigger is delayed or missing
      if (profileErr && (profileErr.code === 'PGRST116' || profileErr.message?.includes('not found') || profileErr.message?.includes('0 rows'))) {
        console.warn('[StitchBill Auth] Profile not found, attempting auto-creation...');
        const { data: insertedProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            email: currentUser.email,
            role: 'tenant_owner',
            full_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0]
          })
          .select()
          .single();

        if (insertErr) {
          console.error('[StitchBill Auth] Failed to auto-create profile:', insertErr);
          setIsLoading(false);
          clearTimeout(metadataTimeout);
          return;
        }
        profileData = insertedProfile;
        profileErr = null;
      } else if (profileErr) {
        console.error('[StitchBill Auth] Error fetching profile:', profileErr);
        setIsLoading(false);
        clearTimeout(metadataTimeout);
        return;
      }

      console.log('[StitchBill Auth] Profile loaded successfully:', profileData);
      setProfile(profileData);

      // If no tenant, redirect to onboarding
      if (!profileData?.tenant_id) {
        console.log('[StitchBill Auth] No tenant linked. Onboarding required.');
        setTenant(null);
        setSettings(null);
        setShops([]);
        setCurrentShopState(null);
        setIsLoading(false);
        clearTimeout(metadataTimeout);
        return;
      }

      const tenantId = profileData.tenant_id;
      console.log('[StitchBill Auth] Tenant ID detected:', tenantId);

      // 2. Fetch Tenant Details
      console.log('[StitchBill Auth] 2. Fetching tenant details...');
      const { data: tenantData, error: tenantErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantErr) {
        console.error('[StitchBill Auth] Error fetching tenant:', tenantErr);
      } else {
        console.log('[StitchBill Auth] Tenant loaded:', tenantData);
        setTenant(tenantData);
      }

      // 3. Fetch Settings
      console.log('[StitchBill Auth] 3. Fetching settings...');
      const { data: settingsData, error: settingsErr } = await supabase
        .from('settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (settingsErr) {
        console.error('[StitchBill Auth] Error fetching settings:', settingsErr);
      } else {
        console.log('[StitchBill Auth] Settings loaded:', settingsData);
        setSettings(settingsData);
      }

      // 4. Fetch Shops
      console.log('[StitchBill Auth] 4. Fetching shops...');
      const { data: shopsData, error: shopsErr } = await supabase
        .from('shops')
        .select('*')
        .eq('tenant_id', tenantId);

      if (shopsErr) {
        console.error('[StitchBill Auth] Error fetching shops:', shopsErr);
      } else if (shopsData) {
        console.log('[StitchBill Auth] Shops loaded:', shopsData);
        setShops(shopsData);
        if (shopsData.length > 0) {
          let defaultShop = shopsData.find((s: Shop) => s.is_warehouse) || shopsData[0];
          
          // Role-specific shop assignment locks
          if (profileData.role === 'warehouse_manager') {
            defaultShop = shopsData.find((s: Shop) => s.is_warehouse) || defaultShop;
          } else if (profileData.role === 'staff') {
            defaultShop = shopsData.find((s: Shop) => !s.is_warehouse) || defaultShop;
          }
          
          console.log('[StitchBill Auth] Default active shop set:', defaultShop.name, 'for role:', profileData.role);
          setCurrentShopState(defaultShop);
        }
      }
    } catch (err) {
      console.error('[StitchBill Auth] Unhandled error in metadata load:', err);
    } finally {
      clearTimeout(metadataTimeout);
      console.log('[StitchBill Auth] Loading metadata complete.');
      setIsLoading(false);
    }
  };

  const refreshAuthData = async () => {
    if (user) {
      await loadAuthMetadata(user);
    }
  };

  // Listen to Auth State
  useEffect(() => {
    let active = true;
    console.log('[StitchBill Auth] Initializing auth listener...');

    const initAuth = async () => {
      try {
        const authTimeout = setTimeout(() => {
          console.warn('[StitchBill Auth] Auth getUser safety timeout reached.');
          if (active) setIsLoading(false);
        }, 60000);

        const { data: { user: currentUser } } = await supabase.auth.getUser();
        clearTimeout(authTimeout);

        if (active) {
          if (currentUser) {
            console.log('[StitchBill Auth] Session found:', currentUser.email);
            setUser(currentUser);
            await loadAuthMetadata(currentUser);
          } else {
            console.log('[StitchBill Auth] No active session found.');
            setUser(null);
            setProfile(null);
            setTenant(null);
            setSettings(null);
            setShops([]);
            setCurrentShopState(null);
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error('[StitchBill Auth] Error checking session:', e);
        if (active) setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log('[StitchBill Auth] Auth event received:', event);
        if (!active) return;
        const currentUser = session?.user || null;
        if (currentUser) {
          setUser(currentUser);
          await loadAuthMetadata(currentUser);
        } else {
          setUser(null);
          setProfile(null);
          setTenant(null);
          setSettings(null);
          setShops([]);
          setCurrentShopState(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setIsLoading(false);
      return { error };
    }
    if (data?.user) {
      setUser(data.user);
      await loadAuthMetadata(data.user);
    }
    return { error: null };
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setTenant(null);
    setSettings(null);
    setShops([]);
    setCurrentShopState(null);
    setIsLoading(false);
  };

  const register = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setIsLoading(false);
      return { error };
    }

    if (data?.user) {
      setUser(data.user);
      if (!isMockMode) {
        // Wait briefly for database auth trigger to fire
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      await loadAuthMetadata(data.user);
    }
    
    return { error: null };
  };

  // CORRECTED ONBOARDING SYSTEM (Step 2 Update Profile FIRST before inserting user_roles and shops)
  const onboardTenant = async (
    businessName: string,
    planType: 'single_shop' | 'multi_branch',
    firstBranchName: string,
    address: string,
    phone: string
  ) => {
    if (!user) return { error: { message: 'User session not found.' } };

    console.log('[StitchBill Onboarding] Initiating tenant setup for:', businessName);
    try {
      setIsLoading(true);

      const onboardTimeout = setTimeout(() => {
        console.error('[StitchBill Onboarding] Onboarding timed out (60s).');
        setIsLoading(false);
      }, 60000);

      // Step 1: Create the Tenant
      console.log('[StitchBill Onboarding] Step 1/5: Creating tenant...');
      const { data: newTenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({
          name: businessName,
          plan_type: planType,
          subscription_status: 'active',
        })
        .select()
        .single();

      if (tenantErr || !newTenant) {
        console.error('[StitchBill Onboarding] Failed to create tenant:', tenantErr);
        clearTimeout(onboardTimeout);
        setIsLoading(false);
        return { error: tenantErr || { message: 'Failed to create tenant' } };
      }

      const tenantId = newTenant.id;
      console.log('[StitchBill Onboarding] Tenant created successfully. ID:', tenantId);

      // Step 2: Update Profile first so subsequent RLS helpers can locate the tenant_id
      console.log('[StitchBill Onboarding] Step 2/5: Updating user profile with tenant_id...');
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          tenant_id: tenantId,
          role: 'tenant_owner',
          full_name: profile?.full_name || user.email.split('@')[0],
        })
        .eq('id', user.id);

      if (profileErr) {
        console.error('[StitchBill Onboarding] Failed to link profile:', profileErr);
        clearTimeout(onboardTimeout);
        setIsLoading(false);
        return { error: profileErr };
      }
      console.log('[StitchBill Onboarding] Profile updated successfully.');

      // Step 3: Insert user role mapping
      console.log('[StitchBill Onboarding] Step 3/5: Registering role mapping...');
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({
          tenant_id: tenantId,
          profile_id: user.id,
          role: 'tenant_owner',
        });

      if (roleErr) {
        console.warn('[StitchBill Onboarding] Warning: Non-blocking role map failure:', roleErr);
      } else {
        console.log('[StitchBill Onboarding] Role mapping registered.');
      }

      // Step 4: Create the first shop branch
      console.log('[StitchBill Onboarding] Step 4/5: Creating first shop branch...');
      const { error: shopErr } = await supabase
        .from('shops')
        .insert({
          tenant_id: tenantId,
          name: firstBranchName,
          is_warehouse: planType === 'multi_branch',
          address: address || null,
          phone: phone || null,
        });

      if (shopErr) {
        console.error('[StitchBill Onboarding] Failed to create shop branch:', shopErr);
      } else {
        console.log('[StitchBill Onboarding] First branch created.');
      }

      // Step 4b: Seed second outlet branch if multi_branch selected
      if (planType === 'multi_branch') {
        console.log('[StitchBill Onboarding] Step 4b/5: Creating retail POS outlet branch...');
        const { error: retailErr } = await supabase
          .from('shops')
          .insert({
            tenant_id: tenantId,
            name: `${businessName} Uptown Outlet`,
            is_warehouse: false,
            address: address ? `${address} Outlet` : null,
            phone: phone || null,
          });

        if (retailErr) {
          console.error('[StitchBill Onboarding] Failed to create POS outlet:', retailErr);
        } else {
          console.log('[StitchBill Onboarding] Retail POS outlet created.');
        }
      }

      console.log('[StitchBill Onboarding] Step 5/5: Syncing workspace structures...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload entire workspace
      await loadAuthMetadata(user);
      
      console.log('[StitchBill Onboarding] Onboarding completed!');
      clearTimeout(onboardTimeout);
      return { error: null };
    } catch (err: any) {
      console.error('[StitchBill Onboarding] Exception caught during setup:', err);
      setIsLoading(false);
      return { error: err || { message: 'System setup error' } };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        tenant,
        settings,
        shops,
        currentShop,
        setCurrentShop,
        isLoading,
        login,
        logout,
        register,
        onboardTenant,
        refreshAuthData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
