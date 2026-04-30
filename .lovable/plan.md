
## السبب الجذري ديال التكرار

تأكدت من قاعدة البيانات للطلبية `B9267AB4F42643` (id=42)، ولقيت 3 أسطر فـ `order_status_history`:

| id  | old_status | new_status | changed_by   | الوقت        | المصدر                 |
|-----|------------|------------|--------------|--------------|------------------------|
| 231 | `Transit`  | `""`       | NULL         | 20:38:33     | trigger (تعديل سابق)   |
| 232 | `""`       | `Transit`  | NULL         | 20:40:03.843 | **trigger DB تلقائي**  |
| 233 | `""`       | `Transit`  | livreur_id   | 20:40:03.898 | **polling INSERT يدوي**|

### المشكل بالضبط

عندنا **مصدرين** كيكتبو فنفس الـhistory:

1. **Trigger `log_order_status_change`** فقاعدة البيانات: كل مرة `orders.status` كيتبدل → كيدير INSERT تلقائي فـ `order_status_history` بـ `changed_by = auth.uid()` (واللي = NULL فحالة edge function بـservice role).
2. **`livreur-poll-status` edge function**: بعد ما كيدير `update orders.status`، كيدير INSERT يدوي ثاني فـ `order_status_history` بـ `changed_by = livreur_id`.

النتيجة: كل تحديث ناجح من polling = **سطرين** فـ history → التكرار اللي كتشوف فالـchronologie.

الحماية الموجودة فالتريغر (10 ثواني + نفس `old_status`/`new_status`/`changed_by`) **ماكتشتغلش** هنا لأن `changed_by` مختلف (NULL ضد livreur_id) → التريغر مكيشوفش السطر اليدوي كنسخة طبق الأصل.

زائد: السطر 231 (`Transit → ""`) كيبين أنه قبل بدقيقتين الـstatus تبدل ل فارغ (يمكن من تجربة سابقة). دفعها فـ`order.status=""` فاش polling قراها → الشرط `mappedStatus === order.status` (`"Transit" === ""`) كان false → دازت التحديث.

---

## السبب الثاني: `driver_name` / `driver_phone` ماكيتلتقطوش من polling

تأكدت بـSQL: **ماكايناش أعمدة `driver_name` ولا `driver_phone` فجدول `orders`**. 

الكود ديال polling حالياً كيدير:
```ts
admin.from("orders").update({ status, status_note, postponed_date, scheduled_date })
```
ماكيخزن حتى driver. زائد polling **ماكيقراش** `webhook_driver_name_field` / `webhook_driver_phone_field` ولا كيدير لهم mapping خاص. UI ديال order-details كيقراهم فقط من آخر webhook log، ماشي من polling logs.

وفـAdminLivreurs.tsx، فقائمة `SYSTEM_ORDER_FIELDS` كاينين `driver_name` و `driver_phone`، ولكن أنت كنت كتعمر بيهم خانة "Order field" د polling payload mapping — وهاد الـmapping أصلا كيتسخدم فالـ**body المرسول للـAPI** (POST request body)، ماشي للالتقاط من الـresponse. ف olivraison polling هو GET بلا body، فهاد الـmapping ماعندو معنى هنا أصلا.

---

## الخطة ديال الإصلاح

### 1. حل التكرار بشكل نهائي — مصدر واحد للحقيقة

نختار النهج: **edge functions كيكتبو فـhistory بأنفسهم، والتريغر كيتجاهل التحديثات اللي جاية من service role / polling / webhook**.

**التغييرات:**

a) **تعديل التريغر `log_order_status_change`** (migration):
   - يكتب history فقط فاش `auth.uid() IS NOT NULL` (يعني تعديل من user حقيقي عبر RLS، ماشي service role).
   - فحالة service role (`auth.uid() IS NULL`) → ماكيكتبش، لأن الedge function هي اللي مسؤولة على كتابة السطر بـ`changed_by=livreur_id` بشكل صريح.
   - هكدا التريغر يبقى مفعل للتعديلات اليدوية من vendeur/admin/livreur عبر UI، وعدم ازدواج مع edge functions.

b) **`livreur-poll-status` و `livreur-webhook`**: يبقاو كيديرو INSERT يدوي للـhistory (هما مصدر الحقيقة لتحديثات provider).

c) **تنظيف السطر الشاذ 231** (`Transit → ""`): هاد البيانات الفاسدة كتخلي `order.status=""` اللي كتفشل dedup. بعد إصلاح التريغر، السبب اللي خلقها (حالة سباق سابقة) ميتكررش.

### 2. حماية إضافية فـpolling ضد race conditions

فـ`livreur-poll-status`، نزيد فحص ثاني قبل INSERT للـhistory:
- نقرا آخر سطر history للorder.
- إلا كان `new_status` ديالو = `mappedStatus` و `changed_at` فآخر 30 ثانية → نتجاهل (skip).

هذا يحمي من نفس polling الـcron اللي يدوز مرتين بسرعة، أو من webhook+polling اللي يجيو فنفس الوقت بنفس الstatus.

### 3. التقاط `driver_name` و `driver_phone` من polling

**خياران:**

**أ. (موصى به) إضافة عمودين `driver_name` و `driver_phone` لجدول `orders`** (migration)، باش يتخزنو رسمياً ويبانو للبائع و livreur فالتفاصيل وفي كل مكان.

ثم:
- فـ`livreur-poll-status` ندير قراءة من body باستخدام `settings.webhook_driver_name_field` و `settings.webhook_driver_phone_field` (نفس paths ديال webhook لأن نفس provider) ونحدثهم فـ`orders` بجوج status.
- نفس الشي فـ`livreur-webhook`: نخزنهم فـ`orders` ماشي فقط فـlogs.
- فـ`order-details`: نقرا `driver_name`/`driver_phone` مباشرة من `orders` (fallback على آخر log إلا فاضيين).
- فـAdminLivreurs (UI): نزيد حقول إعدادات منفصلة "Polling driver name field" و "Polling driver phone field" (مع default = نفس قيم webhook)، باش لكل provider يتم التحكم بشكل منفصل.

**ب. (بديل أبسط)** نعمل نفس الشي ولكن نخزن فـ`status_note` أو نضيف عمود واحد `provider_metadata jsonb` بدل عمودين. أقل نظافة ولكن أكثر مرونة.

**نقترح الخيار (أ)** لأنه واضح وكتظهر الحقول مباشرة فأي query أو UI.

### 4. توضيح UI ديال "Polling payload mapping"

حالياً هاد الحقل كيشوش لأنه مخصص للـrequest body (POST/PUT)، ولكن olivraison GET فماكيستعملوش. نزيد:
- نص توضيحي: "Used only when polling method is POST/PUT/PATCH. For GET requests this is ignored — provider data is captured from the response using the field paths above."
- ونخفيها بشكل اختياري فاش method = GET.

---

## التغييرات التقنية بالملفات

| ملف                                                         | التعديل                                                                  |
|-------------------------------------------------------------|--------------------------------------------------------------------------|
| migration جديدة                                              | تحديث `log_order_status_change` لتخطي service role + إضافة `driver_name`/`driver_phone` لـ`orders` + تنظيف سطر 231 |
| `supabase/functions/livreur-poll-status/index.ts`           | dedup إضافي (آخر history فـ30s) + قراءة driver fields + update فـ`orders` |
| `supabase/functions/livreur-webhook/index.ts`               | تخزين `driver_name`/`driver_phone` فـ`orders` (ماشي فقط فـlog)            |
| `supabase/functions/order-details/index.ts`                 | قراءة driver من `orders` مباشرة (fallback على log)                       |
| `src/pages/admin/parametres/AdminLivreurs.tsx`              | نص توضيحي لـpolling payload mapping + (اختياري) حقول driver منفصلة لـpolling |

---

## النتيجة المتوقعة

- مصدر **واحد** يكتب فـhistory لكل تحديث provider → لا تكرار.
- `Transit` يظهر مرة واحدة فالـchronologie.
- `driver_name` و `driver_phone` يتخزنو فـ`orders` ويبانو فالتفاصيل سواء من webhook أو polling.
- التحديثات اليدوية من vendeur/admin/livreur عبر UI تبقى مسجلة عادي عبر التريغر.
