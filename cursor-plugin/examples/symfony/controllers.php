<?php

declare(strict_types=1);

namespace App\Examples\Symfony;

use App\Entity\User;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\EmailType;
use Symfony\Component\Form\Extension\Core\Type\SubmitType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Symfony — Rule Examples (coding-standards.mdc)
 */

// =============================================================================
// RULE: Default directory structure; namespaces not custom app bundles
// WHY: Symfony conventions match docs, recipes, and new hires' expectations.
// WHY NOT: `src/MyAppBundle/` duplicates framework wiring for no gain.
// =============================================================================

// --- DON'T DO ---
// src/AcmeShopBundle/Controller/ProductController.php

// --- PREFER ---
// src/Controller/ProductController.php  (namespace App\Controller)

// =============================================================================
// RULE: Extend AbstractController; PHP attributes for routing/security
// WHY: Attributes are refactor-friendly and visible beside the action.
// WHY NOT: YAML routes drift from method signatures; annotations are legacy.
// =============================================================================

final class ProductController extends AbstractController
{
    // --- DON'T DO ---
    // $this->container->get('product.repository');

    // --- PREFER ---
    #[Route('/products/{id}', name: 'product_show', methods: ['GET'])]
    #[IsGranted('VIEW', subject: 'product')]
    public function show(int $id, ProductRepository $products): Response
    {
        return $this->render('product/show.html.twig', [
            'product' => $products->find($id),
        ]);
    }
}

// =============================================================================
// RULE: Constructor/method injection — never container->get() for app services
// WHY: Explicit dependencies are testable and visible to static analysis.
// WHY NOT: Service locator pattern hides requirements and breaks in Symfony 6+ private services.
// =============================================================================

// --- DON'T DO (inside controller) ---
// $mailer = $this->container->get('mailer');

// --- PREFER ---
// public function notify(MailerInterface $mailer): Response

// =============================================================================
// RULE: Application services private in services.yaml
// WHY: Only entry points (commands, controllers) should be public.
// WHY NOT: Public services become grab-bag dependencies for any class.
// =============================================================================

// --- DON'T DO ---
// services.yaml: App\Service\OrderService: { public: true }

// --- PREFER ---
// App\Service\: resource: '../src/Service/'  (private by default with autowire)

// =============================================================================
// RULE: Thin controllers; business logic in dedicated services
// WHY: HTTP layer changes independently from domain rules.
// WHY NOT: 200-line controller actions cannot be unit-tested without Request mocking.
// =============================================================================

final class OrderController extends AbstractController
{
    // --- DON'T DO ---
    #[Route('/orders', methods: ['POST'])]
    public function createBad(Request $request, EntityManagerInterface $em): Response
    {
        $data = json_decode($request->getContent(), true);
        if ($data['total'] < 0) {
            throw new \RuntimeException('invalid');
        }
        $order = new Order();
        $order->setTotal($data['total']);
        $em->persist($order);
        $em->flush();
        return $this->redirectToRoute('order_list');
    }

    // --- PREFER ---
    #[Route('/orders', methods: ['POST'])]
    public function createGood(Request $request, OrderCreator $creator): Response
    {
        $order = $creator->createFromRequest($request);
        return $this->redirectToRoute('order_show', ['id' => $order->getId()]);
    }
}

// =============================================================================
// RULE: Extract repeated blocks — controllers, services, Twig, CSS, JS
// WHY: Decode, logging, guards, markup, and styles should change in one place.
// WHY NOT: Parallel actions or templates copy the same 10+ lines verbatim.
// =============================================================================

// --- DON'T DO ---
// addUpdateScheduledTrainingComponentInstanceOutcomes(): decode JSON → find TCI → workflow check
// addScheduledTrainingComponentInstanceAssignmentOutcomes(): decode JSON → find TCI → workflow check // duplicate

// --- PREFER ---
// private function decodeApiKeyProtectedJson(Request $request): array { … }
// private function requireReadyScheduledTraining(int $tciId): array { return [$tci, $scheduledTraining]; }

// =============================================================================
// RULE: Validate request data before business logic
// WHY: Invalid input fails fast with consistent error responses.
// WHY NOT: Persisting then validating leaves partial DB state or orphan rows.
// =============================================================================

final class RegistrationController extends AbstractController
{
    // --- DON'T DO ---
    public function registerBad(Request $request, ValidatorInterface $validator): Response
    {
        $user = new User();
        $user->setEmail($request->request->get('email'));
        $this->em->persist($user); // before validation
        $errors = $validator->validate($user);
        // ...
    }

    // --- PREFER ---
    public function registerGood(Request $request, ValidatorInterface $validator): Response
    {
        $user = new User();
        $user->setEmail((string) $request->request->get('email'));
        $errors = $validator->validate($user);
        if (count($errors) > 0) {
            return $this->render('register.html.twig', ['errors' => $errors]);
        }
        $this->userService->register($user);
        return $this->redirectToRoute('home');
    }
}

// =============================================================================
// RULE: Validation on entities/DTOs, not individual form fields
// WHY: Same rules apply to API, CLI, and forms — single source of truth.
// WHY NOT: Form-only constraints drift from entity constraints after API added.
// =============================================================================

// --- DON'T DO ---
class UserFormBad extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->add('email', EmailType::class, [
            'constraints' => [new Assert\Email()],
        ]);
    }
}

// --- PREFER ---
// Assert\Email on User::$email property; form uses empty constraints

// =============================================================================
// RULE: Submit buttons in Twig templates, not form classes
// WHY: Labels and styling stay in the view layer.
// WHY NOT: SubmitType in PHP forces redeploy for button copy changes.
// =============================================================================

// --- DON'T DO ---
class UserFormWithSubmit extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->add('save', SubmitType::class, ['label' => 'Register']);
    }
}

// --- PREFER ---
// templates/register.html.twig: <button type="submit" class="btn btn-primary">{% trans %}label.register{% endtrans %}</button>

// =============================================================================
// RULE: Deprecations — trigger_deprecation(); failOnDeprecation in PHPUnit
// WHY: Deprecations become breaking changes on next major; catch early in CI.
// WHY NOT: @-suppressed notices accumulate until upgrade weekend blocks release.
// =============================================================================

// --- DON'T DO ---
// @trigger_error('old', E_USER_DEPRECATED);
// phpunit: failOnDeprecation="false"

// --- PREFER ---
// trigger_deprecation('acme/app', '2.0', 'LegacyExporter is deprecated, use CsvExporter.');
// phpunit.dist.xml: failOnDeprecation="true" + deprecationTrigger listeners

// =============================================================================
// RULE: Services must not mutate Request — strip consumed input in the controller
// WHY: Callers do not expect domain services to change the HTTP bag as a side effect.
// WHY NOT: validateOrCreate… removes keys; later controller code cannot re-read them.
// =============================================================================

// --- DON'T DO ---
class EmergencyContactService
{
    public function validateEmergencyContact(Request $request, Person $person): EmergencyContact
    {
        $request->request->remove('emergencyContact');
        $request->request->remove('emergencyContactId');
        return $contact;
    }
}

// --- PREFER ---
class EmergencyContactService
{
    public function validate(Person $person, EmergencyContactAddInputs $input): EmergencyContact
    {
        return $this->factory->create($person, $input);
    }
}

// In controller after service returns:
// $request->request->remove('emergencyContact');
// $request->request->remove('emergencyContactId');

// =============================================================================
// RULE: DTOs are passive — no EntityManager or persist/flush on src/Dto classes
// WHY: DTOs carry data; persistence is infrastructure owned by application services.
// WHY NOT: persistResult() on a DTO couples every caller to Doctrine and blurs layer boundaries.
// =============================================================================

// --- DON'T DO ---
namespace App\Dto\TrainingOutcome;

use Doctrine\ORM\EntityManagerInterface;

class RegistrationOutcomeAddUpdateResult
{
    public function persistResult(EntityManagerInterface $em): void
    {
        $em->persist($this->targetRegistration);
        // ...
    }
}

// In controller:
// $result->persistResult($this->em);

// --- PREFER ---
namespace App\Service\TrainingOutcome;

class RegistrationOutcomeService
{
    public function persistResult(RegistrationOutcomeAddUpdateResult $result, EntityManagerInterface $em): void
    {
        $em->persist($result->getTargetRegistration());
        // ...
    }
}

// Placeholder types for examples
class ProductRepository { public function find(int $id): ?object { return null; } }
class Order { public function setTotal(float $t): void {} public function getId(): int { return 1; } }
class OrderCreator { public function createFromRequest(Request $r): Order { return new Order(); } }
class EntityManagerInterface { public function persist(object $o): void {} public function flush(): void {} }
class UserService { public function register(User $u): void {} }
class ProfileType extends AbstractType {}
