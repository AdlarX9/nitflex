import SwiftUI

struct CreateUserView: View {
    @ObservedObject var viewModel: HomeViewModel
    @State private var newName = ""
    
    var body: some View {
        ZStack {
            Color(Constants.darkGray)
                .ignoresSafeArea(.all)
            VStack(spacing: 20) {
                Text("Ajouter un utilisateur")
                    .font(.system(size: 24))
                    .foregroundColor(.white)
                TextField("Nom de l'utilisateur", text: $newName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .padding()
                    .frame(width: 500)
                Button("Valider") {
                    if !newName.trimmingCharacters(in: .whitespaces).isEmpty {
                        viewModel.createUser(name: newName)
                        newName = ""
                        viewModel.showingSheet = false
                    }
                }
                .buttonStyle(.plain)
                .padding()
                .background(Constants.red)
                .foregroundColor(.white)
                .cornerRadius(8)
                .font(.system(size: 18, weight: .bold))
                .onHover { hovering in
                    if hovering {
                        NSCursor.pointingHand.push()
                    } else {
                    NSCursor.pop()
                    }
                }
                Button("Annuler") {
                    viewModel.showingSheet = false
                    newName = ""
                }
                .buttonStyle(.plain)
                .padding()
                .background(.gray)
                .foregroundColor(.white)
                .cornerRadius(8)
                .font(.system(size: 18, weight: .bold))
                .onHover { hovering in
                    if hovering {
                        NSCursor.pointingHand.push()
                    } else {
                        NSCursor.pop()
                    }
                }
            }
            .padding()
            .presentationDetents([.medium])
        }
    }
}

#Preview {
    CreateUserView(viewModel: HomeViewModel())
}
